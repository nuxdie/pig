import {
  ACESFilmicToneMapping, AmbientLight, DirectionalLight, Group, PerspectiveCamera,
  PMREMGenerator, Quaternion, Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DICE } from '../lib/dice';
import { reduced } from '../lib/motion';
import type { DieId } from '../lib/types';
import { buildDie } from './dieMesh';
import { breathe } from './materials';

/* =====================================================================
   THE DIE ON THE CARD
   A dice card shows the die it installs, turning over, and you can take
   hold of it — the same grip as in the tray, and it drifts back to its
   own slow tumble when you let go.

   There may be half a dozen of these on screen at once (a draft, the
   satchel), so they do not get a WebGL context each: one renderer draws
   every preview in turn into a scissored corner of one small buffer, and
   each card blits its corner into an ordinary 2D canvas. Cheap, and it
   sidesteps the browser's limit on live contexts entirely.

   Geometry and materials come from `dieMesh`, so a die looks the same on
   its card as it does in the tray, and the atlas is paid for once.
   ===================================================================== */

/** The shared buffer, in device pixels. Covers 72 CSS px at 2x. */
const MAX = 144;

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
}

let stage: Stage | null = null;

function theStage(): Stage {
  if (stage) return stage;

  const canvas = document.createElement('canvas');
  canvas.width = MAX;
  canvas.height = MAX;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(1);   // device pixels are managed per card
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();

  // No floor to bounce light back, so the die gets a light behind it as
  // well — otherwise every face turning away goes flat black.
  const key = new DirectionalLight(0xfff2dc, 2.1);
  key.position.set(-2.2, 3.2, 3.0);
  scene.add(key);
  const fill = new DirectionalLight(0xd8e2ff, 0.55);
  fill.position.set(2.8, 0.6, -1.6);
  scene.add(fill);
  const back = new DirectionalLight(0xffffff, 0.4);
  back.position.set(0.4, -1.8, -2.4);
  scene.add(back);
  scene.add(new AmbientLight(0xffffff, 0.2));

  const camera = new PerspectiveCamera(26, 1, 0.5, 20);
  camera.position.set(0, 0, 4.02);
  camera.lookAt(0, 0, 0);

  stage = { renderer, scene, camera, canvas };
  return stage;
}

/** The drift it always comes back to: oblique, so every face gets a turn. */
const IDLE = new Vector3(0.3, 1, 0.17).normalize().multiplyScalar(0.55);
/** Radians per pixel dragged — the tray's grip, so both feel the same. */
const GRIP = 0.012;
/** How long a flick takes to fall back into the drift. */
const SETTLE = 0.6;
const MAX_SPIN = 14;
/** A hand that stopped before letting go has thrown nothing. */
const FLICK_WINDOW = 90;

const YAW = new Vector3(0, 1, 0);
const PITCH = new Vector3(1, 0, 0);
/** Where the drift goes when the player has asked for less motion. */
const STILL = new Vector3();

/**
 * How many previews may draw in one frame. A satchel holds four dice cards on
 * top of the three on offer, and each one costs a render and a blit; capping
 * the work and taking them in turn keeps a crowded screen from getting slower
 * the more of it there is. At this drift, one every second or third frame is
 * indistinguishable from every frame.
 */
const PER_FRAME = 3;

const living: DiePreview[] = [];
let turn = 0;
let raf: number | null = null;

function tick(now: number): void {
  raf = requestAnimationFrame(tick);
  if (!reduced) breathe(now / 1000);

  const n = living.length;
  if (!n) return;
  let drawn = 0;
  for (let k = 0; k < n && drawn < PER_FRAME; k++) {
    const p = living[(turn + k) % n];
    // whoever is being held gets every frame; they are watching that one
    if (p.held()) { p.step(now); continue; }
    if (p.step(now)) drawn++;
  }
  turn = (turn + drawn) % n;
}

export class DiePreview {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private group: Group;
  private q = new Quaternion();
  private vel: Vector3;
  private spin = new Quaternion();
  private axis = new Vector3();
  private w = 0;
  private h = 0;
  private seen = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver | null = null;
  private at = 0;
  private drag: { x: number; y: number; t: number; moved: boolean } | null = null;
  /** A drag that ended in a turn must not also count as taking the card. */
  private swallow: number | null = null;

  constructor(private root: HTMLElement, id: DieId) {
    this.group = buildDie(DICE[id]);
    this.vel = reduced ? new Vector3() : IDLE.clone();

    // Start each one somewhere different, so a row of cards is not a chorus.
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
    this.q.setFromAxisAngle(
      new Vector3(0.4, 1, 0.25).normalize(), ((seed % 360) * Math.PI) / 180
    );

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'diespin';
    this.ctx = this.canvas.getContext('2d')!;
    root.appendChild(this.canvas);

    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(root);
    this.fit();

    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((es) => { this.seen = es[es.length - 1].isIntersecting; });
      this.io.observe(root);
    }

    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);

    living.push(this);
    if (raf === null) raf = requestAnimationFrame(tick);
  }

  private fit(): void {
    // offsetWidth, not the bounding rect: cards animate in on a transform,
    // and measuring mid-animation would size the buffer to a lie.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(MAX, Math.max(1, Math.round(this.root.offsetWidth * dpr)));
    const h = Math.min(MAX, Math.max(1, Math.round(this.root.offsetHeight * dpr)));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.canvas.width = w; this.canvas.height = h;
  }

  /* ------------------------------ the hand ------------------------------ */

  private onDown = (e: PointerEvent) => {
    this.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    this.vel.set(0, 0, 0);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not captured, fine */ }
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    d.moved = true;
    e.preventDefault();

    // Turning it over in the hand, then remembering how fast it was going.
    this.q.premultiply(this.spin.setFromAxisAngle(YAW, dx * GRIP));
    this.q.premultiply(this.spin.setFromAxisAngle(PITCH, dy * GRIP));

    const now = performance.now();
    const dt = Math.max(0.008, (now - d.t) / 1000);
    this.vel.set((dy * GRIP) / dt, (dx * GRIP) / dt, 0).clampLength(0, MAX_SPIN);
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    if (performance.now() - d.t > FLICK_WINDOW) this.vel.set(0, 0, 0);
    if (!d.moved) return;

    // Turning the die over must not also take the card, or dismiss the peek
    // it is sitting in. A drag that ends off the canvas fires its click at
    // some ancestor and never passes through here, so the one click that
    // follows is caught at the root instead — and let go of again straight
    // away, in case no click was coming.
    if (this.swallow === null) window.addEventListener('click', this.onClick, true);
    else clearTimeout(this.swallow);
    this.swallow = window.setTimeout(this.unswallow, 400);
  };

  private onClick = (e: MouseEvent) => {
    this.unswallow();
    e.stopPropagation();
    e.preventDefault();
  };

  private unswallow = () => {
    if (this.swallow === null) return;
    clearTimeout(this.swallow);
    this.swallow = null;
    window.removeEventListener('click', this.onClick, true);
  };

  /* ------------------------------- a frame ------------------------------- */

  held(): boolean {
    return this.drag !== null;
  }

  /** Its turn to draw. False when there was nothing to draw. */
  step(now: number): boolean {
    const dt = this.at ? Math.min(0.1, (now - this.at) / 1000) : 0;
    this.at = now;
    if (!this.seen || !this.w) return false;
    this.frame(dt);
    return true;
  }

  private frame(dt: number): void {

    if (!this.drag) {
      // whatever it is doing, it eases back into the drift
      this.vel.lerp(reduced ? STILL : IDLE, 1 - Math.exp(-dt / SETTLE));
      const speed = this.vel.length();
      if (speed > 1e-4) {
        this.axis.copy(this.vel).divideScalar(speed);
        this.q.premultiply(this.spin.setFromAxisAngle(this.axis, speed * dt));
      }
    }

    const s = theStage();
    s.camera.aspect = this.w / this.h;
    s.camera.updateProjectionMatrix();
    // Draw into the top-left of the shared buffer — GL counts rows from the
    // bottom, the 2D canvas from the top, hence the flip on y.
    s.renderer.setViewport(0, MAX - this.h, this.w, this.h);
    s.renderer.setScissor(0, MAX - this.h, this.w, this.h);
    s.renderer.setScissorTest(true);

    this.group.quaternion.copy(this.q);
    s.scene.add(this.group);
    s.renderer.render(s.scene, s.camera);
    s.scene.remove(this.group);

    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.drawImage(s.canvas, 0, 0, this.w, this.h, 0, 0, this.w, this.h);
  }

  destroy(): void {
    const at = living.indexOf(this);
    if (at > -1) living.splice(at, 1);
    turn = 0;
    if (!living.length && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    this.ro.disconnect();
    this.io?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.unswallow();
    this.canvas.remove();
  }
}
