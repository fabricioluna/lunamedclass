import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnatomyMarker, AnatomyCameraView } from '../../types';
import { appendStrokePoint, flattenPoints, isValidCameraView, isValidMarker, roundVec, unflattenPoints, Vec3 } from '../../utils/anatomyMarkers';

export type AnatomyTool = 'orbit' | 'pin' | 'line';

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

const buildMarkerObject = (marker: AnatomyMarker, diag: number): THREE.Object3D => {
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

const AnatomyViewer: React.FC<Props> = ({ modelUrl, marker, camera, tool = 'orbit', onMarkerDrawn, className, ref }) => {
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
  const markerObjRef = useRef<THREE.Object3D | null>(null);
  const strokeObjRef = useRef<THREE.Line | null>(null);

  // Os handlers de ponteiro são registrados uma vez por peça; leem sempre a versão atual das props.
  const toolRef = useRef(tool);
  const onMarkerDrawnRef = useRef(onMarkerDrawn);
  const cameraPropRef = useRef(camera);
  toolRef.current = tool;
  onMarkerDrawnRef.current = onMarkerDrawn;
  cameraPropRef.current = camera;

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
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.enabled = toolRef.current !== 'line';
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
    const hitAt = (event: PointerEvent) => {
      const model = modelRef.current;
      if (!model) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, cam);
      const hit = raycaster.intersectObject(model.root, true)[0];
      if (!hit || !hit.face) return null;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      return { point: hit.point.clone(), normal };
    };

    let downAt: { x: number; y: number } | null = null;
    let stroke: Vec3[] | null = null;

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
    const liftedPoint = (hit: { point: THREE.Vector3; normal: THREE.Vector3 }): Vec3 =>
      toVec3(hit.point.clone().addScaledVector(hit.normal, (modelRef.current?.diag ?? 1) * 0.002));

    const onPointerDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
      if (toolRef.current !== 'line') return;
      const hit = hitAt(event);
      if (!hit) return;
      renderer.domElement.setPointerCapture(event.pointerId);
      stroke = [liftedPoint(hit)];
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!stroke || toolRef.current !== 'line') return;
      const hit = hitAt(event);
      if (!hit) return;
      const next = appendStrokePoint(stroke, liftedPoint(hit), (modelRef.current?.diag ?? 1) * 0.004);
      if (next !== stroke) {
        stroke = next;
        updateStrokePreview();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const view = getCameraView();
      if (toolRef.current === 'line' && stroke) {
        const finished = stroke;
        stroke = null;
        updateStrokePreview();
        const drawn: AnatomyMarker = { type: 'line', points: flattenPoints(finished) };
        if (view && isValidMarker(drawn)) onMarkerDrawnRef.current?.(drawn, view);
      } else if (toolRef.current === 'pin' && downAt) {
        const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
        const hit = moved <= CLICK_TOLERANCE_PX ? hitAt(event) : null;
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
      markerObjRef.current = null;
      strokeObjRef.current = null;
    };
    // Recria a cena só quando a peça muda; tool, callback e câmera chegam por ref.
  }, [modelUrl]);

  useEffect(() => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model || status !== 'ready') return;
    if (markerObjRef.current) {
      s.scene.remove(markerObjRef.current);
      disposeObject(markerObjRef.current);
      markerObjRef.current = null;
    }
    if (isValidMarker(marker)) {
      markerObjRef.current = buildMarkerObject(marker, model.diag);
      s.scene.add(markerObjRef.current);
    }
  }, [marker, status]);

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
