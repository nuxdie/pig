import { GOAL, WARM_CAP } from './circuit';
import { hasCharge } from './rules';
import type { Card, Player } from './types';

/* =====================================================================
   THE MACHINE
   It enumerates every outcome of the dice it is actually holding and
   applies its own cards, so it plays the loadout it drafted: patient
   behind Ivory, reckless behind Devil, twitchy on three dice.
   ===================================================================== */

/** Expected points from one more roll, given the line as it stands. */
export function rollEV(P: Player, line: number, rolls: number): number {
  const dice = P.dice;
  const shielded = hasCharge(P, 'shield');
  const warmReady = P.rules.warm && !P.warmUsed && line < WARM_CAP;
  const bonus = (P.rules.momentum && rolls > 0) ? 1 : 0;
  const keep = P.rules.insurance ? Math.floor(line / 3) : 0;
  const strike = shielded ? 0 : -(line - keep);
  const wipe = shielded ? 0 : (P.rules.iron ? -(line - keep) : -(P.score + line));

  let total = 0;
  let n = 0;

  function walk(i: number, vals: number[]): void {
    if (i === dice.length) {
      n++;
      const ones: number[] = [];
      let sum = 0;
      vals.forEach((v, k) => { if (v === 1) ones.push(k); sum += v; });
      if (ones.length >= 2) { total += wipe; return; }
      if (ones.length === 1) {
        if (warmReady) {
          // exact value of rethrowing the one die that showed a 1
          const idx = ones[0];
          const rest = sum - 1;
          const f = dice[idx].faces;
          let t = 0;
          for (let k = 0; k < 6; k++) { t += (f[k] === 1) ? strike : (rest + f[k] + bonus); }
          total += t / 6;
        } else total += strike;
        return;
      }
      total += sum + bonus;
      return;
    }
    for (let k = 0; k < 6; k++) { vals.push(dice[i].faces[k]); walk(i + 1, vals); vals.pop(); }
  }

  walk(0, []);
  return total / n;
}

export function machineWantsRoll(
  P: Player, opp: Player, line: number, rolls: number, timid: number | undefined
): boolean {
  if (P.score + line >= GOAL) return false;
  if (line === 0) return true;
  // a timid opponent banks at a flat number instead of doing the sums
  if (timid) return line < timid;
  if (hasCharge(P, 'shield')) return line < 35;
  if (opp.score >= 85 && line < GOAL - P.score && line < 34) return true;
  return rollEV(P, line, rolls) > 0;
}

/** How much the machine wants a given card at draft time. */
export function machineValue(c: Card, P: Player, opp: Player): number {
  let v = Math.random() * 0.6;
  const plain = P.dice.filter((d) => d.id === 'plain').length;
  const behind = opp.score - P.score;

  if (c.cls === 'dice') {
    if (c.id === 'brass')  v += 1.6;
    if (c.id === 'whet')   v += 1.5;
    if (c.id === 'crown')  v += 4.2;
    if (c.id === 'pauper') v += P.score < 60 ? 2.2 : 1.2;
    if (c.id === 'devil')  v += 2.4;
    if (c.id === 'ivory')  v += 3.6;
    if (c.id === 'saint')  v += 3.9;
    if (!plain) v -= 1.6;
  } else if (c.cls === 'rule') {
    if (c.id === 'momentum')  v += 2.0;
    if (c.id === 'insurance') v += 1.9;
    if (c.id === 'steady')    v += 1.6;
    if (c.id === 'warm')      v += 2.2;
    if (c.id === 'habit')     v += P.score < 60 ? 2.4 : 1.3;
    if (c.id === 'tithe')     v += opp.score > 20 ? 2.5 : 1.4;
    if (c.id === 'waxseal')   v += 1.1;
    if (c.id === 'counting')  v += 1.6;
    if (c.id === 'memory')    v += 2.1;
    if (c.id === 'iron')      v += P.score > 40 ? 4.4 : 3.2;
    if (c.id === 'third')     v += behind > 12 ? 3.0 : 2.4;
  } else {
    if (c.id === 'shield')    v += 2.1;
    if (c.id === 'levy')      v += behind > 0 ? 2.6 : 1.3;
    if (c.id === 'wind')      v += 1.8;
    if (c.id === 'warlord')   v += 3.0;
    if (c.id === 'transmute') v += 2.7;
    if (c.id === 'ward')      v += opp.charges.some((x) => !x.spent && x.id !== 'shield') ? 3.1 : 1.0;
    if (c.id === 'quill')     v += 1.7;
    if (c.id === 'bellows')   v += 2.6;
    if (c.id === 'windfall')  v += 3.2;
  }
  return v;
}
