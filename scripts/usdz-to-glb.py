"""Converte peças escaneadas no iPhone (Reality Composer / Object Capture, .usdz) para .glb,
o formato que o Lab 3D aceita (item 6.18 do PLANO-REESTRUTURACAO.md).

Instalação (uma vez só):
    python -m pip install usd-core numpy pillow

Uso:
    python scripts/usdz-to-glb.py C:\\caminho\\cranio1.usdz          -> gera cranio1.glb ao lado
    python scripts/usdz-to-glb.py C:\\caminho\\pasta-de-scans         -> converte todos os .usdz da pasta

Por que JPEG: o Object Capture entrega texturas PNG 2048x2048 (~7 MB por peça). Em JPEG a
peça cai para ~2-3 MB sem diferença visível — é o que decide se ela abre rápido no 4G do aluno.
"""
import io
import json
import struct
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from pxr import Gf, Usd, UsdGeom

JPEG_QUALITY = {"tex": 85, "norm": 92, "ao": 85}


def to_jpeg(png_bytes: bytes, quality: int) -> bytes:
    out = io.BytesIO()
    Image.open(io.BytesIO(png_bytes)).convert("RGB").save(out, "JPEG", quality=quality, optimize=True)
    return out.getvalue()


def read_textures(src: Path) -> dict:
    textures = {}
    with zipfile.ZipFile(src) as zf:
        for name in zf.namelist():
            for kind in JPEG_QUALITY:
                if name.lower().endswith(f"_{kind}0.png"):
                    textures[kind] = to_jpeg(zf.read(name), JPEG_QUALITY[kind])
    return textures


def read_mesh(src: Path):
    stage = Usd.Stage.Open(str(src))
    if UsdGeom.GetStageUpAxis(stage) != UsdGeom.Tokens.y:
        print("  aviso: a peça não está com o eixo Y para cima; pode abrir deitada.")
    meshes = [UsdGeom.Mesh(p) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)]
    if len(meshes) != 1:
        raise ValueError(f"esperava 1 malha (Object Capture), encontrei {len(meshes)}")
    mesh = meshes[0]

    counts = np.array(mesh.GetFaceVertexCountsAttr().Get())
    if np.any(counts != 3):
        raise ValueError("a malha tem faces que não são triângulos")

    xform = UsdGeom.Xformable(mesh.GetPrim()).ComputeLocalToWorldTransform(Usd.TimeCode.Default())
    raw_pts = mesh.GetPointsAttr().Get()
    pts = np.array([xform.Transform(Gf.Vec3d(p)) for p in raw_pts], dtype=np.float32)
    fidx = np.array(mesh.GetFaceVertexIndicesAttr().Get(), dtype=np.int64)

    raw_normals = mesh.GetNormalsAttr().Get()
    normals = None
    if raw_normals is not None and len(raw_normals) == len(raw_pts) and mesh.GetNormalsInterpolation() == "vertex":
        normals = np.array([xform.TransformDir(Gf.Vec3d(n)) for n in raw_normals], dtype=np.float32)
        normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    else:
        print("  aviso: sem normais por vértice; a peça vai parecer facetada.")

    st = UsdGeom.PrimvarsAPI(mesh.GetPrim()).GetPrimvar("st")
    uvs = np.array(st.Get(), dtype=np.float32)
    uv_idx = np.array(st.GetIndices(), dtype=np.int64) if st.IsIndexed() else np.arange(len(fidx))
    return pts, normals, fidx, uvs, uv_idx


def build_glb(pts, normals, fidx, uvs, uv_idx, textures) -> bytes:
    # No USD a UV é por canto de triângulo (faceVarying); no glTF é por vértice. Cada par
    # (ponto, uv) distinto vira um vértice próprio.
    keys = fidx * len(uvs) + uv_idx
    uniq, inverse = np.unique(keys, return_inverse=True)
    p_i, uv_i = uniq // len(uvs), uniq % len(uvs)
    positions = pts[p_i]
    texcoords = uvs[uv_i].copy()
    texcoords[:, 1] = 1.0 - texcoords[:, 1]  # USD tem origem embaixo; glTF, em cima
    indices = inverse.astype(np.uint32)

    buf = bytearray()
    views, accessors = [], []

    def add_view(data: bytes, target=None) -> int:
        while len(buf) % 4:
            buf.append(0)
        view = {"buffer": 0, "byteOffset": len(buf), "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        buf.extend(data)
        return len(views) - 1

    def add_accessor(arr, component_type, kind, target, with_bounds=False) -> int:
        acc = {"bufferView": add_view(arr.tobytes(), target), "componentType": component_type, "count": len(arr), "type": kind}
        if with_bounds:
            acc["min"] = arr.min(0).tolist()
            acc["max"] = arr.max(0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    attributes = {"POSITION": add_accessor(positions, 5126, "VEC3", 34962, True)}
    if normals is not None:
        attributes["NORMAL"] = add_accessor(normals[p_i], 5126, "VEC3", 34962)
    attributes["TEXCOORD_0"] = add_accessor(texcoords, 5126, "VEC2", 34962)
    index_accessor = add_accessor(indices, 5125, "SCALAR", 34963)

    images, gltf_textures, material = [], [], {
        "pbrMetallicRoughness": {"metallicFactor": 0.0, "roughnessFactor": 0.85},
    }
    slots = {"tex": ("pbrMetallicRoughness", "baseColorTexture"), "norm": (None, "normalTexture"), "ao": (None, "occlusionTexture")}
    for kind, (parent, slot) in slots.items():
        if kind not in textures:
            continue
        images.append({"bufferView": add_view(textures[kind]), "mimeType": "image/jpeg"})
        gltf_textures.append({"source": len(images) - 1, "sampler": 0})
        (material[parent] if parent else material)[slot] = {"index": len(gltf_textures) - 1}

    gltf = {
        "asset": {"version": "2.0", "generator": "Luna MedClass usdz-to-glb"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "peca"}],
        "meshes": [{"primitives": [{"attributes": attributes, "indices": index_accessor, "material": 0}]}],
        "materials": [material],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": 0}],
    }
    if images:
        gltf.update(images=images, textures=gltf_textures, samplers=[{"magFilter": 9729, "minFilter": 9987}])

    while len(buf) % 4:
        buf.append(0)
    gltf["buffers"][0]["byteLength"] = len(buf)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    header = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf))
    return header + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(buf), 0x004E4942) + bytes(buf)


def convert(src: Path) -> None:
    dst = src.with_suffix(".glb")
    print(f"{src.name} -> {dst.name}")
    glb = build_glb(*read_mesh(src), read_textures(src))
    dst.write_bytes(glb)
    print(f"  ok: {src.stat().st_size / 1e6:.1f} MB -> {len(glb) / 1e6:.1f} MB")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    target = Path(sys.argv[1])
    files = sorted(target.glob("*.usdz")) if target.is_dir() else [target]
    if not files or not all(f.exists() for f in files):
        print(f"Nenhum .usdz encontrado em {target}")
        return 1
    failures = 0
    for f in files:
        try:
            convert(f)
        except Exception as err:  # uma peça ruim não deve impedir a conversão das outras
            failures += 1
            print(f"  ERRO em {f.name}: {err}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
