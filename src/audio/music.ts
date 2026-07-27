import { hasRun, runState } from '../lib/run.svelte';
import { A, audio, PROG, type Chord } from './engine';
import { playNote, type Inst } from './instruments';
import { barsOf, hz, R, SONGS, type Song } from './song';

/* =====================================================================
   THE SCORE
   A tracker, not a generator. `song.ts` holds written patterns and an
   order to play them in; this file steps through them, and mixes them
   against whatever is happening on the table.

   That last part is the point. The channels are not fixed: the bass
   pulls back when the machine has the pen, the arpeggio comes up as the
   line grows, the bell only appears when the match is close, and every
   filter opens with the tension. Nothing is faded in by a timer — the
   arrangement is a read-out of the game.

   Which song is being read out is decided by who is sitting opposite:
   one per rung, each with its own mode and its own tune.
   ===================================================================== */

/** Whose theme is playing. Changes only between matches. */
export function song(): Song {
  return SONGS[(hasRun() && runState.run!.rung) || 0];
}

/** Into the current foe's key. The effects tune themselves with this. */
export function shift(f: number): number {
  return f * Math.pow(2, song().semi / 12);
}

/* ---------------- what the table is doing ---------------- */

export interface Table {
  /** How close the match is to the edge, 0 … 1. */
  tension: number;
  /** The machine has the pen. */
  theirs: boolean;
  /** Points riding on the dice. */
  line: number;
}

let readTable: () => Table = () => ({ tension: 0, theirs: false, line: 0 });

/** Injected by the game, so audio never imports game state. */
export function setTableSource(fn: () => Table): void {
  readTable = fn;
}

export function tension(): number {
  return readTable().tension;
}

/** Channel levels, recomputed every bar from the state of play. */
const mix: Record<Inst, number> = { pad: 1, bass: 1, lead: 1, arp: 0, bell: 0 };
let open = 0.3;

function remix(): void {
  const t = readTable();
  const heat = Math.min(1, Math.max(0, t.tension));
  const pot = Math.min(1, t.line / 22);

  mix.pad = 1;
  // the pen changing hands is a change of weight, not of volume
  mix.bass = t.theirs ? 0.5 : 1;
  mix.lead = t.theirs ? 0.3 : 0.55 + 0.45 * pot;
  mix.arp = pot * (t.theirs ? 0.45 : 1);
  mix.bell = heat > 0.5 ? (heat - 0.5) * 2 : 0;
  open = (0.22 + 0.78 * heat) * song().air;
}

/* ---------------- the compatibility seam ----------------
   Effects are tuned to the chord under them, so the tray and the ledger
   ring in the same key as whatever is playing. These four are what
   `sfx.ts` reaches for. */

export function chordNow(): Chord {
  return A.chord || PROG[0];
}

export function chordTone(step: number, oct?: number): number {
  const ch = chordNow().n;
  const i = step % ch.length;
  const up = Math.floor(step / ch.length);
  return shift(ch[i]) * Math.pow(2, (oct || 0) + up);
}

/* Repeating an action should not repeat a note. Each event walks its own
   little figure and only resets after a pause, so hammering the bank
   button plays a phrase rather than a metronome. */
const walks: Record<string, { i: number; t: number }> = {};

export function walk(key: string, len: number, resetMs?: number): number {
  const w = walks[key] || (walks[key] = { i: 0, t: 0 });
  const now = Date.now();
  if (now - w.t > (resetMs || 5000)) w.i = 0;
  w.t = now;
  return w.i++ % len;
}

/* ---------------- the player ---------------- */

let orderAt = 0;
/** Eighths elapsed inside the current pattern. */
let inPattern = 0;

function chordFor(chord: number[], deg: number): number {
  const i = ((deg % chord.length) + chord.length) % chord.length;
  const up = Math.floor(deg / chord.length);
  return chord[i] + up * 7;
}

function stepAt(t: number): void {
  const s = song();
  const pattern = s.patterns[s.order[orderAt % s.order.length]];
  const bars = barsOf(pattern);
  const bar = Math.floor(inPattern / 8) % bars;
  const chord = pattern.chords[bar];
  const eighth = 60 / A.bpm / 2;
  // a little push and pull, so the eighths are not a grid — and how much
  // of it there is belongs to the foe as much as the tempo does
  const at = t + (inPattern % 2 ? eighth * s.swing : 0);

  if (inPattern === 0) remix();

  if (inPattern % 8 === 0) {
    // publish the chord in hertz, for the effects to tune themselves to
    A.chord = {
      n: [0, 1, 2, 3].map((k) => shift(hz(chordFor(chord, k) + 7, s.scale))),
      b: shift(hz(chord[0], s.scale))
    };
  }

  for (const tr of pattern.tracks) {
    const raw = tr.n[inPattern % tr.n.length];
    if (raw <= R) continue;
    const level = mix[tr.inst];
    if (level <= 0.02) continue;
    const deg = (tr.chordal ? chordFor(chord, raw) : raw) + (tr.up || 0);
    playNote(tr.inst, {
      f: shift(hz(deg, s.scale)),
      t: at,
      dur: tr.len * eighth,
      vel: tr.vel * level,
      open
    });
  }

  inPattern++;
  if (inPattern >= bars * 8) { inPattern = 0; orderAt++; }
}

function scheduler(): void {
  if (!A.ctx) return;
  const eighth = 60 / A.bpm / 2;
  while (A.next < A.ctx.currentTime + 0.28) {
    stepAt(A.next);
    A.next += eighth;
  }
}

/** A new foe, a new song: called when a match starts. */
export function retune(): void {
  A.bpm = song().bpm;
  if (A.delay) A.delay.delayTime.setTargetAtTime(60 / A.bpm * 0.75, A.ctx!.currentTime, 0.4);
  orderAt = 0;
  inPattern = 0;
  remix();
}

export function startMusic(): void {
  if (A.playing || A.musLevel <= 0) return;
  const c = audio(); if (!c) return;
  A.bpm = song().bpm;
  A.playing = true;
  A.next = c.currentTime + 0.15;
  remix();
  A.mus!.gain.setTargetAtTime(A.musLevel, c.currentTime, 1.6);
  A.timer = setInterval(scheduler, 40);
}

export function stopMusic(): void {
  if (!A.playing) return;
  A.playing = false;
  if (A.timer) clearInterval(A.timer);
  if (A.mus) A.mus.gain.setTargetAtTime(0, A.ctx!.currentTime, 0.4);
}

document.addEventListener('visibilitychange', () => {
  if (!A.ctx || !A.playing) return;
  A.mus!.gain.setTargetAtTime(document.hidden ? 0 : A.musLevel, A.ctx.currentTime, 0.3);
});
