import {
  ACESFilmicToneMapping, AmbientLight, DirectionalLight, Mesh, PCFSoftShadowMap,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, ShadowMaterial,
  SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TRAY_D, TRAY_W } from './solver';

/* The tray itself is never drawn — only the shadows the dice cast on it.
   The page's own paper shows through, so the dice sit on the ledger rather
   than in a box pasted over it. */

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();

  // A neutral room gives the metals and clearcoats something to reflect.
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 1, 100);
  camera.position.set(0.15, 6.0, 7.7);
  camera.lookAt(new Vector3(0, 0.45, 0.25));

  const key = new DirectionalLight(0xfff2dc, 2.9);
  key.position.set(-3.6, 8.5, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 2;
  key.shadow.bias = -0.0006;
  const c = key.shadow.camera;
  c.left = -TRAY_W / 2 - 1; c.right = TRAY_W / 2 + 1;
  c.top = TRAY_D / 2 + 3; c.bottom = -TRAY_D / 2 - 3;
  c.near = 1; c.far = 26;
  c.updateProjectionMatrix();
  scene.add(key);

  const fill = new DirectionalLight(0xd8e2ff, 0.35);
  fill.position.set(5, 4, -4);
  scene.add(fill);

  scene.add(new AmbientLight(0xffffff, 0.12));

  const floor = new Mesh(
    new PlaneGeometry(TRAY_W + 4, TRAY_D + 6),
    new ShadowMaterial({ opacity: 0.42, transparent: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  function resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    // Keep the whole tray in frame however wide the column gets.
    const need = (TRAY_W / 2 + 0.25) / Math.tan((camera.fov * Math.PI / 180) / 2) / camera.aspect;
    camera.position.setLength(Math.max(8.4, need * 1.02));
    camera.lookAt(0, 0.45, 0.25);
    camera.updateProjectionMatrix();
  }

  function dispose() {
    envRT.dispose();
    floor.geometry.dispose();
    (floor.material as ShadowMaterial).dispose();
    renderer.dispose();
  }

  return { scene, camera, renderer, resize, dispose };
}
