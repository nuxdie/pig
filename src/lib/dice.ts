import type { Die, DieId, Faces } from './types';

/* =====================================================================
   DICE
   A die is six faces in cube-slot order: front, back, right, left, top,
   bottom. Rolling picks a slot, so the cube shows exactly what was
   rolled — a weighted die visibly is one.
   ===================================================================== */

export const PIPS: Record<number, number[]> = {
  1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
};
export const SLOTS = ['f-front', 'f-back', 'f-right', 'f-left', 'f-top', 'f-bottom'] as const;
export const LAND: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, 180], [0, -90], [0, 90], [-90, 0], [90, 0]
];

// Measured value is dominated by the chance of a 1, not by the size of the
// faces: a feeble die with no 1 beats a huge die that still carries one.
export const DICE: Record<DieId, Die> = {
  plain:  { id: 'plain',  faces: [1, 6, 3, 4, 2, 5] },          // 3.50 avg, one 1
  brass:  { id: 'brass',  faces: [1, 6, 4, 5, 4, 5] },          // 4.17 avg, one 1
  pauper: { id: 'pauper', faces: [1, 4, 2, 3, 2, 3], bank: 6 }, // 2.50 avg, one 1, pays on every bank
  devil:  { id: 'devil',  faces: [1, 6, 6, 6, 6, 6] },          // 5.17 avg, one 1
  chalk:  { id: 'chalk',  faces: [2, 3, 2, 2, 2, 2] },          // 2.17 avg, no 1
  ivory:  { id: 'ivory',  faces: [2, 5, 3, 4, 2, 2] },          // 3.00 avg, no 1
  saint:  { id: 'saint',  faces: [3, 5, 4, 4, 3, 5] },          // 4.00 avg, no 1
  whet:   { id: 'whet',   faces: [1, 6, 4, 4, 5, 3] },          // 3.83 avg, one 1
  crown:  { id: 'crown',  faces: [3, 6, 4, 5, 3, 6] }           // 4.50 avg, no 1
};

export function avgOf(d: Die): number {
  let s = 0;
  d.faces.forEach((v) => { s += v; });
  return s / 6;
}

export function onesOf(d: Die): number {
  let n = 0;
  d.faces.forEach((v) => { if (v === 1) n++; });
  return n;
}

export function bestSlot(d: Die): number {
  let bi = 0;
  for (let i = 1; i < 6; i++) { if (d.faces[i] > d.faces[bi]) bi = i; }
  return bi;
}

/** At least one die in a hand must carry a 1, or the turn can never end. */
export function keepsAOne(dice: Die[]): boolean {
  return dice.some((d) => (d.faces as Faces).indexOf(1) > -1);
}
