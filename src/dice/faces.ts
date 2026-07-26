import { Quaternion, Vector3 } from 'three';

/* Slot order is the one the game already speaks: front, back, right, left,
   top, bottom. In the tray the *up* face is the one that counts, so every
   conversion here is between a slot index and which way it points. */

export const SLOT_NORMAL: ReadonlyArray<Vector3> = [
  new Vector3(0, 0, 1),   // 0 front
  new Vector3(0, 0, -1),  // 1 back
  new Vector3(1, 0, 0),   // 2 right
  new Vector3(-1, 0, 0),  // 3 left
  new Vector3(0, 1, 0),   // 4 top
  new Vector3(0, -1, 0)   // 5 bottom
];

const UP = new Vector3(0, 1, 0);
const scratch = new Vector3();

/**
 * Which slot is facing up, and how squarely — 1 is dead flat. A die propped
 * against a wall or sitting on another die reads well below that, and has no
 * honest value at all.
 */
export function upSlotAndDot(q: Quaternion): { slot: number; dot: number } {
  let slot = 0;
  let dot = -Infinity;
  for (let i = 0; i < 6; i++) {
    scratch.copy(SLOT_NORMAL[i]).applyQuaternion(q);
    if (scratch.y > dot) { dot = scratch.y; slot = i; }
  }
  return { slot, dot };
}

/** Which slot is facing up, given a body orientation. */
export function upSlot(q: Quaternion): number {
  return upSlotAndDot(q).slot;
}

/** A die more than ~15° off flat is cocked, and is thrown again. */
export const FLAT_ENOUGH = Math.cos(15 * Math.PI / 180);

/** An orientation that puts `slot` face up, spun by `yaw` about vertical. */
export function restQuaternion(slot: number, yaw = 0): Quaternion {
  const q = new Quaternion().setFromUnitVectors(SLOT_NORMAL[slot], UP);
  return new Quaternion().setFromAxisAngle(UP, yaw).multiply(q);
}

/** A tangent basis for a face, so pips can be laid out on its plane. */
export function faceBasis(slot: number): { u: Vector3; v: Vector3 } {
  const n = SLOT_NORMAL[slot];
  // any axis not parallel to the normal works as a seed
  const seed = Math.abs(n.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const u = new Vector3().crossVectors(seed, n).normalize();
  const v = new Vector3().crossVectors(n, u).normalize();
  return { u, v };
}
