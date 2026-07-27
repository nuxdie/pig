import { A, outMus } from './engine';

/* =====================================================================
   INSTRUMENTS
   Six voices, in the spirit of a tracker: each one takes a frequency, a
   time, a length and a velocity, builds its own little graph and lets it
   go. Nothing is pooled and nothing is reused — a note is a handful of
   nodes that stop themselves.

   `open` is how bright the room is allowed to be, and it comes from the
   table rather than from the score: the same phrase played while a big
   line is riding on the dice is a brighter phrase.
   ===================================================================== */

export type Inst = 'pad' | 'bass' | 'lead' | 'arp' | 'bell';

export interface Note {
  f: number;
  t: number;
  /** Seconds. */
  dur: number;
  vel: number;
  /** 0 … 1, how far the filters open. */
  open: number;
}

function env(g: GainNode, t: number, peak: number, attack: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

/** Warm and wooden, a little sharp at the front. Carries the tune. */
function lead(n: Note): void {
  const c = A.ctx!;
  const dur = Math.max(0.12, n.dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 4.5;
  lp.frequency.setValueAtTime(Math.min(9000, n.f * (5 + n.open * 4) + 400), n.t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(240, n.f * 1.7), n.t + Math.min(dur, 0.45));

  const g = c.createGain();
  env(g, n.t, n.vel, 0.008, dur);

  for (const [type, detune, level] of
       [['triangle', -5, 1], ['sawtooth', 7, 0.3]] as [OscillatorType, number, number][]) {
    const o = c.createOscillator();
    o.type = type; o.frequency.value = n.f; o.detune.value = detune;
    const og = c.createGain(); og.gain.value = level;
    o.connect(og); og.connect(lp);
    o.start(n.t); o.stop(n.t + dur + 0.06);
  }
  lp.connect(g); outMus(g);
  g.connect(A.delay!);
}

/** Three saws leaning on each other. Never in front, always underneath. */
function pad(n: Note): void {
  const c = A.ctx!;
  const dur = n.dur;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  const top = 380 + n.open * 1500;
  lp.frequency.setValueAtTime(top * 0.7, n.t);
  lp.frequency.linearRampToValueAtTime(top, n.t + dur * 0.55);
  lp.frequency.linearRampToValueAtTime(top * 0.75, n.t + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, n.t);
  g.gain.linearRampToValueAtTime(n.vel, n.t + dur * 0.38);
  g.gain.linearRampToValueAtTime(0.0001, n.t + dur);

  for (const detune of [-7, 0, 6]) {
    const o = c.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = n.f;
    o.detune.value = detune + (Math.random() * 3 - 1.5);
    const og = c.createGain(); og.gain.value = 0.34;
    o.connect(og); og.connect(lp);
    o.start(n.t); o.stop(n.t + dur + 0.1);
  }
  lp.connect(g); outMus(g);
}

/** Round, short, and felt more than heard. */
function bass(n: Note): void {
  const c = A.ctx!;
  const dur = Math.max(0.2, n.dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 300 + n.open * 260;

  const g = c.createGain();
  env(g, n.t, n.vel, 0.02, dur);

  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = n.f;
  const h = c.createOscillator(); h.type = 'triangle'; h.frequency.value = n.f * 2; h.detune.value = 4;
  const hg = c.createGain(); hg.gain.value = 0.16;
  o.connect(lp); h.connect(hg); hg.connect(lp);
  lp.connect(g); outMus(g);
  o.start(n.t); o.stop(n.t + dur + 0.05);
  h.start(n.t); h.stop(n.t + dur * 0.6);
}

/** A blip with somewhere to go — the delay does most of the work. */
function arp(n: Note): void {
  const c = A.ctx!;
  const dur = Math.min(0.28, Math.max(0.1, n.dur));
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = n.f;
  const g = c.createGain();
  env(g, n.t, n.vel, 0.005, dur);
  o.connect(g);
  outMus(g);
  g.connect(A.delay!);
  o.start(n.t); o.stop(n.t + dur + 0.04);
}

/** Two-operator FM. Struck, not played. */
function bell(n: Note): void {
  const c = A.ctx!;
  const dur = Math.max(0.6, n.dur);
  const car = c.createOscillator(); car.type = 'sine'; car.frequency.value = n.f;
  const mod = c.createOscillator(); mod.type = 'sine'; mod.frequency.value = n.f * 3.01;
  const idx = c.createGain();
  idx.gain.setValueAtTime(n.f * (1.6 + n.open), n.t);
  idx.gain.exponentialRampToValueAtTime(n.f * 0.05, n.t + dur * 0.35);
  mod.connect(idx); idx.connect(car.frequency);

  const g = c.createGain();
  env(g, n.t, n.vel, 0.004, dur);
  car.connect(g); outMus(g);
  g.connect(A.delay!);
  car.start(n.t); car.stop(n.t + dur + 0.05);
  mod.start(n.t); mod.stop(n.t + dur + 0.05);
}

const VOICES: Record<Inst, (n: Note) => void> = { pad, bass, lead, arp, bell };

export function playNote(inst: Inst, n: Note): void {
  if (!A.ctx || n.vel <= 0.0008) return;
  VOICES[inst](n);
}
