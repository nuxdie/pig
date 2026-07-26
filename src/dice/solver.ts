import * as RAPIER from '@dimforge/rapier3d';
import { Quaternion } from 'three';
import { FLAT_ENOUGH, upSlotAndDot } from './faces';

/* =====================================================================
   THE THROW
   The dice are the randomness. A normal roll is one simulation and
   whatever it settles on *is* the roll — nothing picks a number first.

   Only Transmute asks for a particular face, and only for the dice that
   actually rolled a 1. Those are found by rejection sampling: re-throw
   until the pinned dice agree, one simulation per attempt.

   FAIRNESS — and its limit
   Because the roll *is* the simulation, "are these dice fair?" is a real
   question with a measurable answer. The honest answer is: close, but not
   perfectly, and you should know that before relying on it.

   Measured as chi-square on the face distribution (5 df, 11.07 at p=.05),
   over five independent runs of 9,000 three-dice throws each:

      fresh world, cocked dice kept    10.96  8.58  0.91  15.52  26.42
      fresh world + cocked re-throw     7.71  9.49  23.93  6.72   5.81

   Truly uniform dice would average about 5. These average 12.5 and 10.7,
   so a small residual bias is real — on the order of one to two per cent
   on a face. Single measurements here are extremely noisy (note the 0.91
   and the 26.42 in the same configuration); do not draw conclusions from
   one run.

   Three things measurably make it worse, and are the first places to look
   if this ever needs tightening:

   1. Reusing one physics world across throws. That leaves the solver's
      contact and warm-start caches in place and correlates each roll with
      the last, so every throw builds its own — see makeEnv below.
   2. Keeping cocked dice. About 7% come to rest propped on a wall or on
      another die, up to 44 degrees off flat; such a die has no honest
      value at all. They are thrown again, as a real tray would.
   3. A gentle toss. Dropping the throw speed alone took chi-square from
      4.6 to 18.1 in an earlier tuning pass.

   If exact uniformity is ever needed, the fix is to draw the face with
   Math.random and search for a throw that lands on it. That is cheap per
   die (about 1/6 acceptance) but expensive for a whole throw (1/216 for
   three dice, seconds of solving), so it would mean giving each die its
   own lane and losing dice-on-dice collisions.
   ===================================================================== */
export const TRAY_W = 5.9;
export const TRAY_D = 3.5;
const WALL_H = 6;
const MAX_STEPS = 280;
export const STEP_DT = 1 / 50;

/** Per-die, per-step transform: x y z qx qy qz qw. */
export interface Trajectory {
  /** frames[die] is a flat Float32Array of 7 floats per step. */
  frames: Float32Array[];
  steps: number;
  /** Step at which everything came to rest. */
  settle: number;
  slots: number[];
  /** True when every die came to rest square, and nothing was still moving. */
  clean: boolean;
}

export const physicsReady: Promise<void> = Promise.resolve();

export function isReady(): boolean { return true; }

interface Env { world: RAPIER.World; bodies: RAPIER.RigidBody[]; }

/**
 * A throw gets its own world, and frees it afterwards.
 *
 * This is not fastidiousness: reusing one world across throws leaves the
 * solver's contact and warm-start caches in place, which correlates one roll
 * with the next. Measured over 20,000 three-dice throws that showed up as a
 * chi-square of 13.65 on 5 df (against 11.07 at p=.05); building the world
 * fresh each time brings it to 8.62. It costs about a millisecond.
 */
function makeEnv(count: number): Env {
  const world = new RAPIER.World({ x: 0, y: -26, z: 0 });
  const ip = world.integrationParameters;
  ip.dt = STEP_DT;
  ip.numSolverIterations = 1;
  ip.numInternalPgsIterations = 1;

  const fixed = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy, hz).setRestitution(0.40).setFriction(0.82), b);
  };
  fixed(TRAY_W / 2, 0.5, TRAY_D / 2, 0, -0.5, 0);                        // floor
  fixed(0.5, WALL_H / 2, TRAY_D / 2, -TRAY_W / 2 - 0.5, WALL_H / 2, 0);  // left
  fixed(0.5, WALL_H / 2, TRAY_D / 2, TRAY_W / 2 + 0.5, WALL_H / 2, 0);   // right
  fixed(TRAY_W / 2, WALL_H / 2, 0.5, 0, WALL_H / 2, -TRAY_D / 2 - 0.5);  // back
  fixed(TRAY_W / 2, WALL_H / 2, 0.5, 0, WALL_H / 2, TRAY_D / 2 + 0.5);   // front

  const bodies: RAPIER.RigidBody[] = [];
  for (let i = 0; i < count; i++) {
    const b = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.14).setAngularDamping(0.26));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setRestitution(0.38).setFriction(0.85).setDensity(1.2), b);
    bodies.push(b);
  }
  return { world, bodies };
}

function mulberry(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomQuat(R: () => number): [number, number, number, number] {
  const u1 = R(), u2 = R(), u3 = R();
  const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
  return [s1 * Math.sin(2 * Math.PI * u2), s1 * Math.cos(2 * Math.PI * u2),
          s2 * Math.sin(2 * Math.PI * u3), s2 * Math.cos(2 * Math.PI * u3)];
}

export interface RestState { x: number; y: number; z: number; q: [number, number, number, number]; }

/**
 * One throw, in a world of its own. `active` are the dice being thrown;
 * anything in `resting` is placed as it lies so a re-thrown die can still
 * knock against it.
 */
function simulate(
  count: number, active: number[], resting: Map<number, RestState>, seed: number, record: boolean
): Trajectory {
  const { world, bodies } = makeEnv(count);
  try {
    return run(world, bodies, count, active, resting, seed, record);
  } finally {
    world.free();
  }
}

function run(
  world: RAPIER.World, bodies: RAPIER.RigidBody[],
  count: number, active: number[], resting: Map<number, RestState>, seed: number, record: boolean
): Trajectory {
  const R = mulberry(seed);
  const q0 = new Quaternion();

  for (let i = 0; i < count; i++) {
    const b = bodies[i];

    const held = resting.get(i);
    if (held && !active.includes(i)) {
      b.setTranslation({ x: held.x, y: held.y, z: held.z }, true);
      b.setRotation({ x: held.q[0], y: held.q[1], z: held.q[2], w: held.q[3] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.wakeUp();
      continue;
    }

    const q = randomQuat(R);
    b.setTranslation({
      x: -TRAY_W / 2 + 0.8 + i * 0.4 + (R() - 0.5) * 0.25,
      y: 2.7 + R() * 1.0,
      z: -TRAY_D / 2 + 0.8 + (R() - 0.5) * 0.4
    }, true);
    b.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
    b.setLinvel({ x: 3.4 + R() * 2.4, y: -0.6, z: 1.7 + R() * 1.9 }, true);
    b.setAngvel({ x: (R() - 0.5) * 36, y: (R() - 0.5) * 36, z: (R() - 0.5) * 36 }, true);
    b.wakeUp();
  }

  const frames: Float32Array[] = record
    ? Array.from({ length: count }, () => new Float32Array(MAX_STEPS * 7))
    : [];
  let settle = MAX_STEPS;
  let steps = MAX_STEPS;

  for (let s = 0; s < MAX_STEPS; s++) {
    world.step();

    if (record) {
      for (let i = 0; i < count; i++) {
        const t = bodies[i].translation();
        const r = bodies[i].rotation();
        const o = s * 7;
        const f = frames[i];
        f[o] = t.x; f[o + 1] = t.y; f[o + 2] = t.z;
        f[o + 3] = r.x; f[o + 4] = r.y; f[o + 5] = r.z; f[o + 6] = r.w;
      }
    }

    let moving = false;
    for (let i = 0; i < count; i++) {
      const lv = bodies[i].linvel(), av = bodies[i].angvel();
      if (lv.x * lv.x + lv.y * lv.y + lv.z * lv.z > 0.0025 ||
          av.x * av.x + av.y * av.y + av.z * av.z > 0.02) { moving = true; break; }
    }
    if (!moving) { settle = s; steps = s + 1; break; }
  }

  const slots: number[] = [];
  let clean = settle < MAX_STEPS;
  for (let i = 0; i < count; i++) {
    const r = bodies[i].rotation();
    const { slot, dot } = upSlotAndDot(q0.set(r.x, r.y, r.z, r.w));
    slots.push(slot);
    if (dot < FLAT_ENOUGH) clean = false;
  }
  return { frames, steps, settle, slots, clean };
}

/** Re-throws allowed when the dice land cocked. ~7% per die, so this is plenty. */
const COCK_BUDGET = 40;

/**
 * Throw `active` dice. `pin` maps a die index to a slot it must land on;
 * anything not pinned is free and takes whatever the dice give it.
 */
export function solveThrow(
  count: number,
  active: number[],
  resting: Map<number, RestState>,
  pin: Map<number, number>,
  seed = (Math.random() * 0x7fffffff) | 0
): Trajectory {
  if (pin.size === 0) {
    for (let k = 0; k < COCK_BUDGET; k++) {
      const trySeed = (seed + k * 2654435761) >>> 0;
      if (simulate(count, active, resting, trySeed, false).clean) {
          return simulate(count, active, resting, trySeed, true);
      }
    }
    return simulate(count, active, resting, seed, true);
  }

  // Rejection sampling. Bounded so a pathological ask (all three dice
  // pinned, ~1/216) cannot stall the turn; the caller eases any die that
  // is still wrong into place as it settles.
  const BUDGET = 260;

  let bestSeed = seed;
  let bestScore = -1;

  for (let k = 0; k < BUDGET; k++) {
    const trySeed = (seed + k * 2654435761) >>> 0;
    const t = simulate(count, active, resting, trySeed, false);
    let score = 0;
    pin.forEach((want, i) => { if (t.slots[i] === want) score++; });
    if (!t.clean) score -= 1;
    if (score > bestScore) { bestScore = score; bestSeed = trySeed; }
    if (score === pin.size) {
      return simulate(count, active, resting, trySeed, true);
    }
  }

  return simulate(count, active, resting, bestSeed, true);
}
