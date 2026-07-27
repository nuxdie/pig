/* =====================================================================
   AUDIO — one room, one key. Music and effects share a reverb and a
   scale, so the dice and the ledger sound like the same place.
   ===================================================================== */

interface Rig {
  ctx: AudioContext | null;
  master: GainNode | null;
  sfx: GainNode | null;
  sfxSend: GainNode | null;
  mus: GainNode | null;
  musComp: DynamicsCompressorNode | null;
  musSend: GainNode | null;
  verb: ConvolverNode | null;
  verbOut: GainNode | null;
  delay: DelayNode | null;
  sfxLevel: number;
  musLevel: number;
  playing: boolean;
  timer: ReturnType<typeof setInterval> | null;
  step: number;
  next: number;
  bpm: number;
  chord: Chord | null;
}

export interface Chord {
  /** The four voices of the chord. */
  n: number[];
  /** Its bass note. */
  b: number;
}

export const A: Rig = {
  ctx: null, master: null, sfx: null, sfxSend: null, mus: null, musComp: null, musSend: null,
  verb: null, verbOut: null, delay: null,
  sfxLevel: 0.8, musLevel: 0.5,
  playing: false, timer: null, step: 0, next: 0, bpm: 61, chord: null
};

export const PROG: Chord[] = [
  { n: [220.00, 261.63, 329.63, 493.88], b: 110.00 },
  { n: [174.61, 261.63, 329.63, 440.00], b:  87.31 },
  { n: [196.00, 261.63, 329.63, 493.88], b: 130.81 },
  { n: [164.81, 246.94, 293.66, 392.00], b:  82.41 },
  { n: [174.61, 220.00, 293.66, 329.63], b:  73.42 },
  { n: [174.61, 261.63, 329.63, 440.00], b:  87.31 },
  { n: [196.00, 246.94, 293.66, 392.00], b:  98.00 },
  { n: [220.00, 261.63, 329.63, 493.88], b: 110.00 }
];

export const POOL = [440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50];

function makeIR(dur: number, decay: number): AudioBuffer {
  const ctx = A.ctx!;
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * dur);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  }
  return buf;
}

export function audio(): AudioContext | null {
  if (A.ctx) {
    if (A.ctx.state === 'suspended') void A.ctx.resume();
    return A.ctx;
  }
  const C = window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;

  const ctx = new C();
  A.ctx = ctx;
  A.master = ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(ctx.destination);
  A.verb = ctx.createConvolver(); A.verb.buffer = makeIR(3.4, 2.6);
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3400;
  A.verbOut = ctx.createGain(); A.verbOut.gain.value = 0.55;
  A.verb.connect(warm); warm.connect(A.verbOut); A.verbOut.connect(A.master);
  A.sfx = ctx.createGain(); A.sfx.gain.value = A.sfxLevel; A.sfx.connect(A.master);
  A.sfxSend = ctx.createGain(); A.sfxSend.gain.value = 0.22; A.sfxSend.connect(A.verb);
  // The score runs through a compressor: it glues five voices that know
  // nothing about each other into one instrument, and it means the levels
  // below can be set for how the thing should sound rather than for the
  // worst bar in the song.
  A.musComp = ctx.createDynamicsCompressor();
  A.musComp.threshold.value = -20;
  A.musComp.knee.value = 14;
  A.musComp.ratio.value = 3.5;
  A.musComp.attack.value = 0.008;
  A.musComp.release.value = 0.26;
  A.musComp.connect(A.master);
  A.mus = ctx.createGain(); A.mus.gain.value = 0; A.mus.connect(A.musComp);
  A.musSend = ctx.createGain(); A.musSend.gain.value = 0.42; A.musSend.connect(A.verb);
  A.delay = ctx.createDelay(1.2); A.delay.delayTime.value = 60 / A.bpm * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.33;
  const wet = ctx.createGain(); wet.gain.value = 0.3;
  A.delay.connect(fb); fb.connect(A.delay);
  A.delay.connect(wet); wet.connect(A.mus); wet.connect(A.musSend);
  return ctx;
}

export function outSfx(node: AudioNode): void { node.connect(A.sfx!); node.connect(A.sfxSend!); }
export function outMus(node: AudioNode): void { node.connect(A.mus!); node.connect(A.musSend!); }

export function duck(amount: number, back: number): void {
  if (!A.mus || !A.playing) return;
  const t = A.ctx!.currentTime;
  const g = A.mus.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(A.musLevel * (1 - amount), t + 0.05);
  g.linearRampToValueAtTime(A.musLevel, t + back);
}

export interface ToneOpts {
  f: number; to?: number; at?: number; dur?: number;
  vol?: number; type?: OscillatorType; lp?: number;
}

export function tone(o: ToneOpts): void {
  const c = audio(); if (!c) return;
  const t0 = c.currentTime + (o.at || 0);
  const dur = o.dur || 0.15;
  const osc = c.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp || 2600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(lp); lp.connect(g); outSfx(g);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

export interface BellOpts { f: number; at?: number; dur?: number; vol?: number; }

export function bell(o: BellOpts): void {
  const c = audio(); if (!c) return;
  const t0 = c.currentTime + (o.at || 0);
  const dur = o.dur || 0.9;
  const vol = o.vol || 0.12;
  const partials: Array<[number, number, number]> = [
    [1, vol, dur], [2.76, vol * 0.3, dur * 0.45], [5.4, vol * 0.12, dur * 0.25]
  ];
  partials.forEach((p) => {
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.value = o.f * p[0];
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(p[1], t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[2]);
    osc.connect(g); outSfx(g);
    osc.start(t0); osc.stop(t0 + p[2] + 0.05);
  });
}

export interface KnockOpts { f?: number; q?: number; at?: number; dur?: number; vol?: number; }

export function knock(o: KnockOpts): void {
  const c = audio(); if (!c) return;
  const t0 = c.currentTime + (o.at || 0);
  const dur = o.dur || 0.07;
  const n = Math.max(1, Math.ceil(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4); }
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = o.f || 1500; bp.Q.value = o.q || 1.3;
  const g = c.createGain(); g.gain.value = o.vol || 0.14;
  src.connect(bp); bp.connect(g); outSfx(g);
  src.start(t0);
}
