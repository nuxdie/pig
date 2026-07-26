import { hasRun, runState } from '../lib/run.svelte';
import { A, audio, outMus, POOL, PROG, type Chord } from './engine';

/* Every foe carries a leitmotif: their own key, tempo, and a four-note
   figure that surfaces every other bar. Same room, different tenant. */
interface Foe { semi: number; bpm: number; fig: number[]; soft: number; }

const FOES: Foe[] = [
  { semi:  0, bpm: 61, fig: [0, 2, 4, 2], soft: 1.00 },  // Publican  — plain A minor
  { semi:  2, bpm: 64, fig: [4, 3, 1, 0], soft: 0.95 },  // Wheelwright
  { semi: -3, bpm: 58, fig: [0, 1, 3, 1], soft: 1.05 },  // Reeve
  { semi:  5, bpm: 66, fig: [2, 4, 5, 4], soft: 0.92 },  // Alchemist
  { semi: -1, bpm: 56, fig: [5, 3, 2, 0], soft: 1.08 },  // Abbot
  { semi:  3, bpm: 69, fig: [0, 4, 3, 6], soft: 0.88 },  // Executioner
  { semi: -5, bpm: 52, fig: [6, 4, 2, 0], soft: 1.15 }   // Devil     — low and slow
];

export function foe(): Foe {
  return FOES[(hasRun() && runState.run!.rung) || 0];
}

export function shift(f: number): number {
  return f * Math.pow(2, foe().semi / 12);
}

export function chordNow(): Chord {
  return A.chord || PROG[0];
}

/* How close the match is to the edge. Injected by the game rather than
   imported from it, so audio never depends on game state. */
let tensionSource: () => number = () => 0;

export function setTensionSource(fn: () => number): void {
  tensionSource = fn;
}

export function tension(): number {
  return tensionSource();
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

export function chordTone(step: number, oct?: number): number {
  const ch = chordNow().n;
  const i = step % ch.length;
  const up = Math.floor(step / ch.length);
  return shift(ch[i]) * Math.pow(2, (oct || 0) + up);
}

/* ---------------- generative score ---------------- */

function pad(ch: Chord, t0: number, dur: number): void {
  const c = A.ctx!;
  const open = 420 + tension() * 1100;
  ch.n.forEach((f, i) => {
    [-4.5, 4.5].forEach((cents) => {
      const o = c.createOscillator();
      o.type = i > 1 ? 'sine' : 'triangle';
      o.frequency.value = shift(f);
      o.detune.value = cents + (Math.random() * 3 - 1.5);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(open * 0.75, t0);
      lp.frequency.linearRampToValueAtTime(open, t0 + dur * 0.5);
      lp.frequency.linearRampToValueAtTime(open * 0.8, t0 + dur);
      const g = c.createGain();
      const peak = 0.032 / (1 + i * 0.22);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + dur * 0.42);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o.connect(lp); lp.connect(g); outMus(g);
      o.start(t0); o.stop(t0 + dur + 0.08);
    });
  });
}

function bassNote(f: number, t0: number, dur: number): void {
  const c = A.ctx!;
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2; o2.detune.value = 5;
  const g = c.createGain();
  const g2 = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.6);
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(0.02, t0 + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
  o.connect(g); o2.connect(g2); outMus(g); outMus(g2);
  o.start(t0); o.stop(t0 + dur * 0.65); o2.start(t0); o2.stop(t0 + 1.0);
}

function voice(f: number, t0: number, vol: number, soft: boolean): void {
  const c = A.ctx!;
  const o = c.createOscillator(); o.type = soft ? 'sine' : 'triangle'; o.frequency.value = f;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3000 + tension() * 1500, t0);
  lp.frequency.exponentialRampToValueAtTime(700, t0 + 0.7);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);
  o.connect(lp); lp.connect(g); outMus(g); g.connect(A.delay!);
  o.start(t0); o.stop(t0 + 1.0);
}

let motif: number[] | null = null;

function newMotif(): number[] {
  const m: number[] = [];
  let last = 3;
  for (let i = 0; i < 8; i++) {
    if (Math.random() < 0.42) { m.push(-1); continue; }
    last = Math.max(0, Math.min(POOL.length - 1, last + (Math.floor(Math.random() * 5) - 2)));
    m.push(last);
  }
  return m;
}

const BAR = 16;

function stepAt(i: number, t: number): void {
  const ci = Math.floor(i / BAR) % PROG.length;
  const ch = PROG[ci];
  const eighth = 60 / A.bpm / 2;
  t += (i % 2) ? eighth * 0.055 : 0;

  if (i % BAR === 0) {
    A.chord = ch;
    pad(ch, t, BAR * eighth);
    bassNote(shift(ch.b), t, BAR * eighth);
    if (ci % 4 === 0 && (!motif || Math.random() < 0.55)) motif = newMotif();
  }

  // the foe's own figure, every other bar, sitting under everything else
  const F = foe();
  if (i % (BAR * 2) === 4) {
    F.fig.forEach((d, k) => {
      voice(shift(POOL[d]) * F.soft, t + k * eighth * 1.5, 0.030, true);
    });
  }

  const section = Math.floor(i / (BAR * 2)) % 2;
  if (section === 0 && i % 2 === 0) {
    const k = (i / 2) % ch.n.length;
    const oct = ((i / 2) % 8 < 4) ? 2 : 4;
    voice(shift(ch.n[k]) * oct / 2, t, 0.019 + tension() * 0.008, true);
  }

  if (motif) {
    const d = motif[i % motif.length];
    if (d >= 0 && Math.random() < 0.55 + tension() * 0.3) {
      voice(shift(POOL[d]), t, 0.038 + Math.random() * 0.02, false);
    }
  }

  if (i % BAR === BAR - 2 && Math.random() < 0.6) {
    voice(shift(POOL[POOL.length - 1]) * 2, t, 0.016, true);
  }
}

function scheduler(): void {
  if (!A.ctx) return;
  const eighth = 60 / A.bpm / 2;
  while (A.next < A.ctx.currentTime + 0.28) { stepAt(A.step, A.next); A.step++; A.next += eighth; }
}

export function retune(): void {
  A.bpm = foe().bpm;
  if (A.delay) A.delay.delayTime.setTargetAtTime(60 / A.bpm * 0.75, A.ctx!.currentTime, 0.4);
  motif = null;
}

export function startMusic(): void {
  if (A.playing || A.musLevel <= 0) return;
  const c = audio(); if (!c) return;
  A.bpm = foe().bpm;
  A.playing = true;
  A.next = c.currentTime + 0.15;
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
