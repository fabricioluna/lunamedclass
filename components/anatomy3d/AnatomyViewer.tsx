import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnatomyMarker, AnatomyCameraView, AnatomyPaintStroke } from '../../types';
import {
  accumulatePaintPoint, appendStrokePoint, computePaintAlpha, flattenPoints, isValidCameraView, isValidMarker,
  paintRadiusFor, roundVec, unflattenPoints, Vec3,
} from '../../utils/anatomyMarkers';

export type AnatomyTool = 'orbit' | 'pin' | 'line' | 'straight' | 'paint';

export interface AnatomyViewerHandle {
  getCameraView: () => AnatomyCameraView | null;
  resetView: () => void;
}

interface Props {
  modelUrl: string;
  marker?: AnatomyMarker | null;
  camera?: AnatomyCameraView;
  tool?: AnatomyTool;
  onMarkerDrawn?: (marker: AnatomyMarker, camera: AnatomyCameraView) => void;
  // Espessura do marca-texto (1–10), ver paintRadiusFor.
  paintSize?: number;
  onModelLoaded?: (info: { diag: number }) => void;
  className?: string;
  ref?: React.Ref<AnatomyViewerHandle>;
}

const MARKER_COLOR = 0xe11d48;
// Um clique que arrasta mais que isso foi um giro da peça, não uma marcação.
const CLICK_TOLERANCE_PX = 6;

// Peças se repetem entre questões seguidas da mesma sessão: o cache evita baixar o GLB de novo.
THREE.Cache.enabled = true;

const toVec3 = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

// Haste saindo reta da superfície aponta para a câmera e a cabeça tampa o ponto marcado.
// Inclina para cima e para a direita da tela de quem marcou, sem deixar entrar na peça.
const pinDirection = (normal: THREE.Vector3, cam: THREE.Camera): THREE.Vector3 => {
  const up = new THREE.Vector3(0, 1, 0).transformDirection(cam.matrixWorld);
  const right = new THREE.Vector3(1, 0, 0).transformDirection(cam.matrixWorld);
  const dir = normal.clone().multiplyScalar(0.5).addScaledVector(up, 0.7).addScaledVector(right, 0.45).normalize();
  if (dir.dot(normal) < 0.35) dir.addScaledVector(normal, 0.8).normalize();
  return dir;
};

const disposeObject = (obj: THREE.Object3D) => {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((m) => {
      Object.values(m).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      m.dispose();
    });
  });
};

interface ModelInfo {
  root: THREE.Object3D;
  center: THREE.Vector3;
  diag: number;
}

type SurfaceHit = { point: THREE.Vector3; normal: THREE.Vector3 };

// === MARCA-TEXTO ===
// Camada translúcida: cópia da malha da peça com cor por vértice (RGBA), presa à própria malha
// e desenhada por cima com polygonOffset para não "brigar" com a superfície.
interface PaintLayer {
  overlay: THREE.Mesh;
  alpha: Float32Array;
  colors: Float32Array;
  positions: ArrayLike<number>;
  normals: ArrayLike<number> | null;
  toLocal: THREE.Matrix4;
  normalToLocal: THREE.Matrix3;
}

const PAINT_RGB = new THREE.Color(MARKER_COLOR);

const modelMeshes = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.isMarker) meshes.push(mesh);
  });
  return meshes;
};

// Os traços são gravados em coordenadas da cena; o cálculo da tinta é feito no espaço da malha.
const toLocalStroke = (stroke: AnatomyPaintStroke, layer: PaintLayer): AnatomyPaintStroke => {
  const points: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i + 2 < stroke.points.length; i += 3) {
    const p = new THREE.Vector3(stroke.points[i], stroke.points[i + 1], stroke.points[i + 2]).applyMatrix4(layer.toLocal);
    const n = new THREE.Vector3(stroke.normals[i], stroke.normals[i + 1], stroke.normals[i + 2]).applyMatrix3(layer.normalToLocal).normalize();
    points.push(p.x, p.y, p.z);
    normals.push(n.x, n.y, n.z);
  }
  return { radius: stroke.radius, points, normals };
};

const syncLayerColors = (layer: PaintLayer) => {
  for (let v = 0; v < layer.alpha.length; v++) layer.colors[v * 4 + 3] = layer.alpha[v];
  (layer.overlay.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
};

const buildPaintLayers = (root: THREE.Object3D, strokes: readonly AnatomyPaintStroke[]): PaintLayer[] =>
  modelMeshes(root).map((mesh) => {
    const geometry = mesh.geometry.clone();
    const positions = geometry.getAttribute('position').array;
    const normalAttr = geometry.getAttribute('normal');
    const count = positions.length / 3;
    const colors = new Float32Array(count * 4);
    for (let v = 0; v < count; v++) {
      colors[v * 4] = PAINT_RGB.r;
      colors[v * 4 + 1] = PAINT_RGB.g;
      colors[v * 4 + 2] = PAINT_RGB.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    const overlay = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    overlay.userData.isMarker = true;
    overlay.renderOrder = 1;
    mesh.updateWorldMatrix(true, false);
    const toLocal = mesh.matrixWorld.clone().invert();
    const layer: PaintLayer = {
      overlay, colors, positions,
      normals: normalAttr ? normalAttr.array : null,
      alpha: new Float32Array(count),
      toLocal,
      normalToLocal: new THREE.Matrix3().getNormalMatrix(toLocal),
    };
    layer.alpha = computePaintAlpha(positions, layer.normals, strokes.map((s) => toLocalStroke(s, layer)));
    syncLayerColors(layer);
    mesh.add(overlay);
    return layer;
  });

const paintPointOnLayers = (layers: PaintLayer[], point: Vec3, normal: Vec3, radius: number) => {
  for (const layer of layers) {
    const local = toLocalStroke({ radius, points: [...point], normals: [...normal] }, layer);
    accumulatePaintPoint(layer.alpha, layer.positions, layer.normals, local.points, local.normals, radius);
    syncLayerColors(layer);
  }
};

const buildMarkerObject = (marker: Exclude<AnatomyMarker, { type: 'paint' }>, diag: number): THREE.Object3D => {
  const material = new THREE.MeshBasicMaterial({ color: MARKER_COLOR });
  const group = new THREE.Group();

  if (marker.type === 'pin') {
    const position = new THREE.Vector3(...marker.position);
    const direction = new THREE.Vector3(...marker.direction).normalize();
    const stalkLength = diag * 0.07;
    const head = new THREE.Mesh(new THREE.SphereGeometry(diag * 0.013, 20, 14), material);
    head.position.copy(position).addScaledVector(direction, stalkLength);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(diag * 0.0022, diag * 0.0022, stalkLength, 8), material);
    stalk.position.copy(position).addScaledVector(direction, stalkLength / 2);
    stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(diag * 0.003, 10, 8), material);
    tip.position.copy(position);
    group.add(head, stalk, tip);
    return group;
  }

  const points = unflattenPoints(marker.points).map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(points);
  const segments = Math.min(Math.max(points.length * 4, 16), 800);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, diag * 0.0035, 8, false), material));
  return group;
};

const AnatomyViewer: React.FC<Props> = ({
  modelUrl, marker, camera, tool = 'orbit', onMarkerDrawn, paintSize = 4, onModelLoaded, className, ref,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    renderer: THREE.WebGLRenderer;
  } | null>(null);
  const modelRef = useRef<ModelInfo | null>(null);
  // Tudo que a marcação atual pôs na cena (alfinete, linha ou camadas do marca-texto).
  const markerObjsRef = useRef<THREE.Object3D[]>([]);
  const paintLayersRef = useRef<PaintLayer[] | null>(null);
  const strokeObjRef = useRef<THREE.Line | null>(null);
  const cancelStraightRef = useRef<() => void>(() => {});

  // Os handlers de ponteiro são registrados uma vez por peça; leem sempre a versão atual das props.
  const toolRef = useRef(tool);
  const onMarkerDrawnRef = useRef(onMarkerDrawn);
  const cameraPropRef = useRef(camera);
  const markerRef = useRef(marker);
  const paintSizeRef = useRef(paintSize);
  const onModelLoadedRef = useRef(onModelLoaded);
  toolRef.current = tool;
  onMarkerDrawnRef.current = onMarkerDrawn;
  cameraPropRef.current = camera;
  markerRef.current = marker;
  paintSizeRef.current = paintSize;
  onModelLoadedRef.current = onModelLoaded;

  const clearMarkerObjects = () => {
    for (const obj of markerObjsRef.current) {
      obj.removeFromParent();
      disposeObject(obj);
    }
    markerObjsRef.current = [];
    paintLayersRef.current = null;
  };

  const applyView = (view: AnatomyCameraView | undefined) => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model) return;
    if (isValidCameraView(view)) {
      s.camera.position.set(view.position[0], view.position[1], view.position[2]);
      s.controls.target.set(view.target[0], view.target[1], view.target[2]);
    } else {
      s.controls.target.copy(model.center);
      s.camera.position.copy(model.center).add(new THREE.Vector3(0, 0.25, 1).normalize().multiplyScalar(model.diag * 1.3));
    }
    s.controls.update();
  };

  const getCameraView = (): AnatomyCameraView | null => {
    const s = sceneRef.current;
    if (!s) return null;
    return { position: roundVec(toVec3(s.camera.position)), target: roundVec(toVec3(s.controls.target)) };
  };

  useImperativeHandle(ref, () => ({ getCameraView, resetView: () => applyView(cameraPropRef.current) }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setStatus('loading');
    setProgress(0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    // O canvas acompanha o contêiner em vez de ditar a largura: com largura fixa em px ele
    // empurrava a página para fora da tela no celular (rolagem lateral no iPhone, 6.19).
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1d22);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.001, 100);
    scene.add(cam);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
    // Luz presa à câmera: a face que o aluno está olhando nunca fica no escuro ao girar.
    const headlight = new THREE.DirectionalLight(0xffffff, 1.6);
    headlight.position.set(0.3, 0.5, 1);
    cam.add(headlight);

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    sceneRef.current = { scene, camera: cam, controls, renderer };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      // Linha à mão livre e marca-texto usam o arrasto para desenhar; os outros, para girar.
      controls.enabled = toolRef.current !== 'line' && toolRef.current !== 'paint';
      controls.update();
      renderer.render(scene, cam);
    };
    loop();

    let cancelled = false;
    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const diag = box.getSize(new THREE.Vector3()).length() || 1;
        scene.add(gltf.scene);
        modelRef.current = { root: gltf.scene, center, diag };
        cam.near = diag / 200;
        cam.far = diag * 50;
        cam.updateProjectionMatrix();
        controls.minDistance = diag * 0.15;
        controls.maxDistance = diag * 5;
        applyView(cameraPropRef.current);
        onModelLoadedRef.current?.({ diag });
        setStatus('ready');
      },
      (event) => {
        if (event.total > 0) setProgress(Math.round((event.loaded / event.total) * 100));
      },
      (err) => {
        console.error('Erro ao carregar peça 3D:', err);
        if (!cancelled) setStatus('error');
      },
    );

    // === MARCAÇÃO ===
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // A camada do marca-texto é cópia da malha: sem filtrar, o raio acertaria a tinta.
    const firstModelHit = (): SurfaceHit | null => {
      const model = modelRef.current;
      if (!model) return null;
      const hit = raycaster.intersectObject(model.root, true).find((h) => !h.object.userData.isMarker);
      if (!hit || !hit.face) return null;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      return { point: hit.point.clone(), normal };
    };

    const hitAt = (event: PointerEvent): SurfaceHit | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, cam);
      return firstModelHit();
    };

    let downAt: { x: number; y: number } | null = null;
    let stroke: Vec3[] | null = null;
    let paintStroke: { radius: number; points: Vec3[]; normals: Vec3[] } | null = null;
    let straightStart: SurfaceHit | null = null;
    let straightDot: THREE.Mesh | null = null;

    const updateStrokePreview = () => {
      if (strokeObjRef.current) {
        scene.remove(strokeObjRef.current);
        strokeObjRef.current.geometry.dispose();
        strokeObjRef.current = null;
      }
      if (!stroke || stroke.length < 2) return;
      const geometry = new THREE.BufferGeometry().setFromPoints(stroke.map((p) => new THREE.Vector3(...p)));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: MARKER_COLOR }));
      scene.add(line);
      strokeObjRef.current = line;
    };

    // A linha fica um fio acima da superfície: rente demais, a textura "come" pedaços dela.
    const liftedPoint = (hit: SurfaceHit): Vec3 =>
      toVec3(hit.point.clone().addScaledVector(hit.normal, (modelRef.current?.diag ?? 1) * 0.002));

    const cancelStraight = () => {
      straightStart = null;
      if (straightDot) {
        scene.remove(straightDot);
        disposeObject(straightDot);
        straightDot = null;
      }
    };
    cancelStraightRef.current = cancelStraight;

    // Reta: amostra o segmento A→B e projeta cada amostra na superfície pela linha de visão da
    // câmera. Resultado: reta na tela de quem marcou, mas colada no osso (acompanha a curvatura).
    const straightLinePoints = (a: THREE.Vector3, b: THREE.Vector3): Vec3[] => {
      const diag = modelRef.current?.diag ?? 1;
      const samples = Math.min(Math.max(Math.ceil(a.distanceTo(b) / (diag * 0.003)), 2), 400);
      const origin = cam.position.clone();
      const points: Vec3[] = [];
      for (let i = 0; i <= samples; i++) {
        const target = a.clone().lerp(b, i / samples);
        raycaster.set(origin, target.clone().sub(origin).normalize());
        const hit = firstModelHit();
        points.push(hit ? liftedPoint(hit) : toVec3(target));
      }
      return points;
    };

    const startPaintStroke = (hit: SurfaceHit) => {
      const model = modelRef.current;
      if (!model) return;
      // Pintando sobre algo que não é pintura (alfinete, linha, nada): começa uma área nova.
      if (!paintLayersRef.current) {
        clearMarkerObjects();
        const layers = buildPaintLayers(model.root, []);
        paintLayersRef.current = layers;
        markerObjsRef.current = layers.map((l) => l.overlay);
      }
      const radius = paintRadiusFor(model.diag, paintSizeRef.current);
      paintStroke = { radius, points: [toVec3(hit.point)], normals: [toVec3(hit.normal)] };
      paintPointOnLayers(paintLayersRef.current, toVec3(hit.point), toVec3(hit.normal), radius);
    };

    const onPointerDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
      if (toolRef.current !== 'line' && toolRef.current !== 'paint') return;
      const hit = hitAt(event);
      if (!hit) return;
      renderer.domElement.setPointerCapture(event.pointerId);
      if (toolRef.current === 'line') stroke = [liftedPoint(hit)];
      else startPaintStroke(hit);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (paintStroke && toolRef.current === 'paint') {
        const hit = hitAt(event);
        if (!hit || !paintLayersRef.current) return;
        // Espaçamento de meio raio: cobre sem falhas e não infla o documento no banco.
        const next = appendStrokePoint(paintStroke.points, toVec3(hit.point), paintStroke.radius * 0.5);
        if (next === paintStroke.points) return;
        paintStroke.points = next;
        paintStroke.normals.push(toVec3(hit.normal));
        paintPointOnLayers(paintLayersRef.current, toVec3(hit.point), toVec3(hit.normal), paintStroke.radius);
        return;
      }
      if (!stroke || toolRef.current !== 'line') return;
      const hit = hitAt(event);
      if (!hit) return;
      const next = appendStrokePoint(stroke, liftedPoint(hit), (modelRef.current?.diag ?? 1) * 0.004);
      if (next !== stroke) {
        stroke = next;
        updateStrokePreview();
      }
    };

    const isClick = (event: PointerEvent) =>
      !!downAt && Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) <= CLICK_TOLERANCE_PX;

    const onPointerUp = (event: PointerEvent) => {
      const view = getCameraView();
      if (toolRef.current === 'paint' && paintStroke) {
        const finished: AnatomyPaintStroke = {
          radius: Math.round(paintStroke.radius * 1e5) / 1e5,
          points: flattenPoints(paintStroke.points),
          // 2 casas bastam para uma normal: ela só decide de que lado do osso a tinta vale.
          normals: paintStroke.normals.flatMap((n) => n.map((c) => Math.round(c * 100) / 100)),
        };
        paintStroke = null;
        const current = markerRef.current;
        const previous = current?.type === 'paint' ? current.strokes : [];
        const drawn: AnatomyMarker = { type: 'paint', strokes: [...previous, finished] };
        if (view && isValidMarker(drawn)) onMarkerDrawnRef.current?.(drawn, view);
      } else if (toolRef.current === 'straight' && isClick(event)) {
        const hit = hitAt(event);
        if (hit && !straightStart) {
          straightStart = hit;
          const diag = modelRef.current?.diag ?? 1;
          straightDot = new THREE.Mesh(new THREE.SphereGeometry(diag * 0.006, 12, 10), new THREE.MeshBasicMaterial({ color: MARKER_COLOR }));
          straightDot.position.copy(hit.point);
          scene.add(straightDot);
        } else if (hit && straightStart) {
          const drawn: AnatomyMarker = { type: 'line', points: flattenPoints(straightLinePoints(straightStart.point, hit.point)) };
          cancelStraight();
          if (view && isValidMarker(drawn)) onMarkerDrawnRef.current?.(drawn, view);
        }
      } else if (toolRef.current === 'line' && stroke) {
        const finished = stroke;
        stroke = null;
        updateStrokePreview();
        const drawn: AnatomyMarker = { type: 'line', points: flattenPoints(finished) };
        if (view && isValidMarker(drawn)) onMarkerDrawnRef.current?.(drawn, view);
      } else if (toolRef.current === 'pin' && isClick(event)) {
        const hit = hitAt(event);
        if (hit && view) {
          onMarkerDrawnRef.current?.(
            { type: 'pin', position: roundVec(toVec3(hit.point)), direction: roundVec(toVec3(pinDirection(hit.normal, cam))) },
            view,
          );
        }
      }
      downAt = null;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      container.removeChild(canvas);
      sceneRef.current = null;
      modelRef.current = null;
      markerObjsRef.current = [];
      paintLayersRef.current = null;
      strokeObjRef.current = null;
      cancelStraightRef.current = () => {};
    };
    // Recria a cena só quando a peça muda; tool, callback, câmera e marcação chegam por ref.
  }, [modelUrl]);

  useEffect(() => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model || status !== 'ready') return;
    clearMarkerObjects();
    if (!isValidMarker(marker)) return;
    if (marker.type === 'paint') {
      const layers = buildPaintLayers(model.root, marker.strokes);
      paintLayersRef.current = layers;
      markerObjsRef.current = layers.map((l) => l.overlay);
    } else {
      const obj = buildMarkerObject(marker, model.diag);
      s.scene.add(obj);
      markerObjsRef.current = [obj];
    }
  }, [marker, status]);

  // Trocou de ferramenta com só o ponto A da reta marcado: descarta o ponto A.
  useEffect(() => {
    if (tool !== 'straight') cancelStraightRef.current();
  }, [tool]);

  // Questão nova na mesma peça: a peça continua carregada, só a câmera volta ao ângulo da questão.
  useEffect(() => {
    if (status === 'ready' && camera) applyView(camera);
  }, [camera, status]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className ?? ''}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-xs font-bold gap-3 pointer-events-none">
          <div className="w-8 h-8 border-4 border-white/10 border-t-[#D4A017] rounded-full animate-spin" />
          Carregando peça 3D{progress > 0 ? `… ${progress}%` : '…'}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-200 text-xs font-bold">
          Não foi possível carregar a peça 3D. Verifique sua conexão e tente de novo.
        </div>
      )}
    </div>
  );
};

export default AnatomyViewer;
