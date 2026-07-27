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

/* Where the camera looks from, and at. A little steeper than a person leaning
   over a table, because the face that counts is the one pointing up. */
const DIR = new Vector3(0.12, 6.6, 7.0).normalize();
const TARGET = new Vector3(0, 0.4, 0.1);
const WORLD_UP = new Vector3(0, 1, 0);

/**
 * The corners the frame has to hold. Two boxes rather than one, because the
 * dice and their shadows do not occupy the same space:
 *
 *  - every die at rest, anywhere in the tray, from a little above the floor
 *    to the top of one standing on its edge;
 *  - the floor, but only as far forward as the shadows reach. The key light
 *    comes from the front, so shadows fall backwards, and the strip of empty
 *    tray nearest the camera is the most expensive thing in the frame —
 *    holding on to it was costing about a quarter of the dice.
 */
const REACH = 0.6;  // how far a die's body sticks out past its centre
const KEEP: Vector3[] = [];
for (const x of [-TRAY_W / 2 - 0.1, TRAY_W / 2 + 0.1]) {
  for (const z of [-TRAY_D / 2 - 0.1, TRAY_D / 2 + 0.1]) {
    for (const y of [0.3, 0.5 + REACH]) KEEP.push(new Vector3(x, y, z));
  }
  for (const z of [-TRAY_D / 2, TRAY_D / 2 - 0.75]) KEEP.push(new Vector3(x, 0, z));
}

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
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();

  // A neutral room gives the metals and clearcoats something to reflect.
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.58;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 1, 100);
  camera.position.copy(DIR).multiplyScalar(9).add(TARGET);
  camera.lookAt(TARGET);

  // 2.9 blew the bone dice out to white and took the pips' shading with it;
  // the environment carries more of the load now instead.
  const key = new DirectionalLight(0xfff2dc, 2.0);
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

  scene.add(new AmbientLight(0xffffff, 0.16));

  const floor = new Mesh(
    new PlaneGeometry(TRAY_W + 4, TRAY_D + 6),
    new ShadowMaterial({ opacity: 0.42, transparent: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const right = new Vector3();
  const up = new Vector3();
  const w4 = new Vector3();

  /**
   * How far back the camera has to stand for every corner of KEEP to fall
   * inside the frustum. Solved rather than guessed: for a corner at offset
   * `w` from the target, the frame holds it once
   * `distance >= |w·right| / tanH + w·dir`, and the same for the vertical.
   * On a wide tray the height binds, on a narrow one the width does, and
   * this picks whichever it is instead of assuming.
   */
  function fitDistance(aspect: number): number {
    const tanV = Math.tan((camera.fov * Math.PI / 180) / 2);
    const tanH = tanV * aspect;
    right.crossVectors(WORLD_UP, DIR).normalize();
    up.crossVectors(DIR, right);
    let d = 0;
    for (const corner of KEEP) {
      w4.subVectors(corner, TARGET);
      const along = w4.dot(DIR);
      d = Math.max(d,
        Math.abs(w4.dot(right)) / tanH + along,
        Math.abs(w4.dot(up)) / tanV + along);
    }
    return d;
  }

  function resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.position.copy(DIR).multiplyScalar(fitDistance(camera.aspect) * 1.02).add(TARGET);
    camera.lookAt(TARGET);
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
