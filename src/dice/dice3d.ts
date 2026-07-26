import { Group, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { play } from '../audio/sfx';
import { reduced } from '../lib/motion';
import type { Die } from '../lib/types';
import { buildDie, disposeDieGeometry } from './dieMesh';
import { restQuaternion, upSlot } from './faces';
import { createStage, type Stage } from './scene';
import {
  isReady, physicsReady, solveThrow, STEP_DT, TRAY_D, TRAY_W,
  type RestState, type Trajectory
} from './solver';

/* =====================================================================
   THE TRAY
   Real rigid bodies in a real tray. The dice decide the roll: a throw is
   one simulation and whatever comes up is what was rolled. Only Transmute
   asks for particular faces, and only for the dice that rolled a 1.

   Playback replays the recorded trajectory rather than stepping physics
   live, so the result is known before the first frame is drawn and a
   dropped frame can never change the outcome.
   ===================================================================== */

export interface TrayOptions {
  /** Whether a die may currently be picked up or tapped. */
  canHandle: () => boolean;
  /** A tap (as opposed to a drag) on any die. */
  onTap: () => void;
  /** Reports the slot each die came to rest on, so state survives a remount. */
  onSlot: (i: number, slot: number) => void;
}

/** Playback speed. The sim settles in ~1.4s of its own time; this tightens it. */
const PLAY_RATE = 1.35;
/** How long the dice sit still before the turn carries on. */
const HOLD_AFTER_LAND = 260;

const qNext = new Quaternion();

interface Held {
  group: Group;
  die: Die;
  /** Orientation it rests at, so a drag can spring back to it. */
  rest: Quaternion;
  restPos: Vector3;
}

export class Tray {
  private stage: Stage | null = null;
  private canvas: HTMLCanvasElement;
  private dice: Held[] = [];
  private raf: number | null = null;
  private ro: ResizeObserver | null = null;
  private disposed = false;

  private playing: Trajectory | null = null;
  private playFrom = 0;
  private onLanded: (() => void) | null = null;
  private landedFired = false;

  private drag: { i: number; x: number; y: number; moved: boolean; base: Quaternion } | null = null;
  private nudged = false;

  constructor(private root: HTMLElement, private opts: TrayOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tray__canvas';
    this.root.appendChild(this.canvas);

    this.stage = createStage(this.canvas);

    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this.root);
    this.fit();

    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);

    this.loop();
  }

  private fit(): void {
    const w = this.root.clientWidth || 1;
    const h = this.root.clientHeight || 1;
    this.stage?.resize(w, h);
  }

  /* ------------------------------ dice ------------------------------ */

  mount(dice: Die[], slots: number[]): void {
    if (!this.stage) return;
    this.playing = null;
    this.onLanded = null;

    this.dice.forEach((d) => this.stage!.scene.remove(d.group));
    this.dice = [];

    const n = dice.length;
    dice.forEach((die, i) => {
      const group = buildDie(die);
      const slot = slots[i] ?? 0;
      // Fan them across the tray in the order they will be thrown.
      const restPos = new Vector3(
        (i - (n - 1) / 2) * 1.65,
        0.5,
        0.35
      );
      const rest = restQuaternion(slot, (i - 1) * 0.28);
      group.position.copy(restPos);
      group.quaternion.copy(rest);
      this.stage!.scene.add(group);
      this.dice.push({ group, die, rest, restPos });
      this.opts.onSlot(i, slot);
    });
  }

  /* ----------------------------- throwing ----------------------------- */

  /**
   * Throw the dice at `which`. `pinFor` is handed the freely-rolled slots and
   * may return a map of die index → slot that must come up instead (that is
   * how Transmute turns 1s to gold); returning null accepts the roll as it
   * fell. `cb` receives the slot every die finally shows.
   */
  throwDice(
    which: number[],
    pinFor: ((rolled: number[]) => Map<number, number> | null) | null,
    cb: (slots: number[]) => void
  ): void {
    const count = this.dice.length;
    if (!count) { cb([]); return; }

    const go = () => {
      if (this.disposed) return;
      if (!isReady()) { cb(this.currentSlots()); return; }

      const resting = new Map<number, RestState>();
      this.dice.forEach((d, i) => {
        if (which.includes(i)) return;
        resting.set(i, {
          x: d.group.position.x, y: d.group.position.y, z: d.group.position.z,
          q: [d.group.quaternion.x, d.group.quaternion.y, d.group.quaternion.z, d.group.quaternion.w]
        });
      });

      // Roll freely first — that sample *is* the roll.
      let traj = solveThrow(count, which, resting, new Map());
      const pin = pinFor ? pinFor(traj.slots.slice()) : null;
      if (pin && pin.size) {
        traj = solveThrow(count, which, resting, pin);
        // A pinned die the budget could not reach is eased into place as it
        // settles; ~1/216 and only ever under Transmute.
        pin.forEach((want, i) => {
          if (traj.slots[i] !== want) this.forceSlot(traj, i, want);
        });
      }

      const slots = traj.slots.slice();
      this.dice.forEach((_, i) => this.opts.onSlot(i, slots[i]));

      if (reduced) {
        this.applyFrame(traj, traj.steps - 1);
        this.captureRest();
        play('land');
        cb(slots);
        return;
      }

      play('throwDice', which.length);
      this.playing = traj;
      this.playFrom = performance.now();
      this.landedFired = false;
      this.onLanded = () => {
        this.captureRest();
        setTimeout(() => cb(slots), HOLD_AFTER_LAND);
      };
    };

    if (isReady()) go();
    else physicsReady.then(go);
  }

  /**
   * Rotate a die's whole recorded path so a different face ends up on top.
   * Only reachable when rejection sampling ran out of budget.
   */
  private forceSlot(traj: Trajectory, i: number, want: number): void {
    const f = traj.frames[i];
    if (!f) return;
    const last = (traj.steps - 1) * 7;
    const q = new Quaternion(f[last + 3], f[last + 4], f[last + 5], f[last + 6]);
    const target = restQuaternion(want, Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x)));
    const delta = target.clone().multiply(q.clone().invert());

    // Ease the correction in over the last stretch so it reads as a final tip.
    const blendFrom = Math.max(0, traj.steps - 18);
    const tmp = new Quaternion();
    for (let s = blendFrom; s < traj.steps; s++) {
      const o = s * 7;
      const t = (s - blendFrom) / Math.max(1, traj.steps - 1 - blendFrom);
      tmp.identity().slerp(delta, t * t * (3 - 2 * t));
      const cur = new Quaternion(f[o + 3], f[o + 4], f[o + 5], f[o + 6]);
      cur.premultiply(tmp);
      f[o + 3] = cur.x; f[o + 4] = cur.y; f[o + 5] = cur.z; f[o + 6] = cur.w;
    }
    traj.slots[i] = want;
  }

  /** The sim runs at 50Hz; the screen does not, so frames are interpolated. */
  private applyFrame(traj: Trajectory, step: number): void {
    const last = traj.steps - 1;
    const clamped = Math.max(0, Math.min(last, step));
    const a = Math.floor(clamped);
    const b = Math.min(last, a + 1);
    const t = clamped - a;

    this.dice.forEach((d, i) => {
      const f = traj.frames[i];
      if (!f) return;
      const oa = a * 7;
      const ob = b * 7;
      d.group.position.set(
        f[oa] + (f[ob] - f[oa]) * t,
        f[oa + 1] + (f[ob + 1] - f[oa + 1]) * t,
        f[oa + 2] + (f[ob + 2] - f[oa + 2]) * t
      );
      d.group.quaternion.set(f[oa + 3], f[oa + 4], f[oa + 5], f[oa + 6]);
      if (t > 0 && b !== a) {
        qNext.set(f[ob + 3], f[ob + 4], f[ob + 5], f[ob + 6]);
        d.group.quaternion.slerp(qNext, t);
      }
    });
  }

  private captureRest(): void {
    this.dice.forEach((d) => {
      d.rest.copy(d.group.quaternion);
      d.restPos.copy(d.group.position);
    });
  }

  private currentSlots(): number[] {
    return this.dice.map((d) => upSlot(d.group.quaternion));
  }

  /* ------------------------------ input ------------------------------ */

  private pick(e: PointerEvent): number {
    if (!this.stage) return -1;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    const ray = new Raycaster();
    ray.setFromCamera(ndc, this.stage.camera);
    for (let i = 0; i < this.dice.length; i++) {
      if (ray.intersectObject(this.dice[i].group, true).length) return i;
    }
    return -1;
  }

  private onDown = (e: PointerEvent) => {
    if (this.playing || !this.opts.canHandle()) return;
    const i = this.pick(e);
    if (i < 0) return;
    this.drag = { i, x: e.clientX, y: e.clientY, moved: false, base: this.dice[i].group.quaternion.clone() };
    this.canvas.style.cursor = 'grabbing';
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not captured, fine */ }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.drag) {
      if (!this.playing && this.opts.canHandle()) {
        this.canvas.style.cursor = this.pick(e) >= 0 ? 'grab' : '';
      }
      return;
    }
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) this.drag.moved = true;
    if (!this.drag.moved) return;
    e.preventDefault();

    // Drag turns the die over in the hand; letting go springs it back.
    const spin = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), dx * 0.012)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dy * 0.012));
    this.dice[this.drag.i].group.quaternion.copy(spin).multiply(this.drag.base);
  };

  private onUp = (e: PointerEvent) => {
    this.canvas.style.cursor = '';
    if (!this.drag) return;
    const { moved } = this.drag;
    this.drag = null;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (moved || !this.opts.canHandle()) return;
    this.opts.onTap();
  };

  nudge(on: boolean): void {
    this.nudged = on && !reduced;
  }

  /* ------------------------------ frame ------------------------------ */

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const stage = this.stage;
    if (!stage) return;

    const now = performance.now();

    if (this.playing) {
      const t = this.playing;
      const step = ((now - this.playFrom) / 1000) * PLAY_RATE / STEP_DT;
      this.applyFrame(t, step);
      if (!this.landedFired && step >= t.settle) {
        this.landedFired = true;
        play('land');
      }
      if (step >= t.steps - 1) {
        this.applyFrame(t, t.steps - 1);
        this.playing = null;
        const done = this.onLanded;
        this.onLanded = null;
        done?.();
      }
    } else if (!this.drag) {
      // ease back to rest, and lift a little while the Roll button is hovered
      const lift = this.nudged ? 0.34 : 0;
      this.dice.forEach((d, i) => {
        d.group.quaternion.slerp(d.rest, 0.22);
        const targetY = d.restPos.y + lift;
        d.group.position.y += (targetY - d.group.position.y) * 0.18;
        d.group.position.x += (d.restPos.x - d.group.position.x) * 0.18;
        d.group.position.z += (d.restPos.z - d.group.position.z) * 0.18;
        if (this.nudged) d.group.rotateY(0.004 * (i % 2 ? -1 : 1));
      });
    }

    stage.renderer.render(stage.scene, stage.camera);
  };

  destroy(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.dice.forEach((d) => this.stage?.scene.remove(d.group));
    this.dice = [];
    this.stage?.dispose();
    this.stage = null;
    disposeDieGeometry();
    this.canvas.remove();
  }
}

export { TRAY_W, TRAY_D };
