import { A, bell, duck, knock, tone } from './engine';
import { chordNow, chordTone, shift, walk } from './music';

/* Each card has its own short signature, built from the chord that is
   playing, so an effect firing sounds like part of the music. */
function cardSound(id: string): void {
  const s = walk('card:' + id, 3, 25000);
  switch (id) {
    case 'momentum':
      bell({ f: chordTone(s + 1, 1), vol: .075, dur: .5 }); break;
    case 'insurance':
      tone({ f: shift(220), dur: .5, vol: .16, type: 'sine', lp: 900 });
      bell({ at: .06, f: chordTone(0, 1), vol: .09, dur: 1.0 }); break;
    case 'steady':
      knock({ f: 440, q: 2.4, vol: .2, dur: .07 });
      bell({ at: .04, f: chordTone(s, 1), vol: .11, dur: .9 }); break;
    case 'habit':
      bell({ f: chordTone(s, 1), vol: .1, dur: .8 });
      bell({ at: .08, f: chordTone(s + 2, 1), vol: .07, dur: .9 }); break;
    case 'pauper':
      knock({ f: 2600, q: 3.2, vol: .16, dur: .04 });
      bell({ at: .03, f: chordTone(4, 2), vol: .1, dur: .7 }); break;
    case 'counting':
      [0, 1, 2].forEach((k) => { bell({ at: k * .05, f: chordTone(k, 1), vol: .075, dur: .6 }); }); break;
    case 'waxseal':
      knock({ f: 320, q: 1.6, vol: .26, dur: .11 });
      bell({ at: .05, f: chordTone(0, 0), vol: .12, dur: 1.1 }); break;
    case 'tithe':
      tone({ f: shift(392), to: shift(294), dur: .34, vol: .17, type: 'triangle', lp: 1100 }); break;
    case 'memory':
      tone({ f: shift(262), to: shift(392), dur: .4, vol: .14, type: 'sine', lp: 1600 });
      bell({ at: .2, f: chordTone(2, 1), vol: .08, dur: .8 }); break;
    case 'iron':
      tone({ f: shift(110), dur: .7, vol: .28, type: 'square', lp: 520 });
      knock({ at: .02, f: 180, q: 1.1, vol: .3, dur: .24 }); break;
    case 'quill':
      bell({ f: chordTone(3, 2), vol: .11, dur: .6 });
      bell({ at: .07, f: chordTone(5, 2), vol: .09, dur: .7 }); break;
    case 'bellows':
      tone({ f: shift(147), to: shift(294), dur: .5, vol: .24, type: 'sawtooth', lp: 900 });
      bell({ at: .24, f: chordTone(2, 1), vol: .12, dur: .9 }); break;
    case 'windfall':
      [0, 2, 4, 6].forEach((k) => { bell({ at: k * .055, f: chordTone(k, 1), vol: .11, dur: 1.2 }); }); break;
    default:
      bell({ f: chordTone(s, 1), vol: .09, dur: .7 });
  }
}

const SFX = {
  throwDice(n: number) {
    knock({ f: 1750, q: 1.1, vol: .3, dur: .05 });
    knock({ at: .07, f: 1300, q: 1.5, vol: .24, dur: .05 });
    knock({ at: .15, f: 2050, q: 1.0, vol: .18, dur: .04 });
    knock({ at: .33, f: 1500, q: 1.2, vol: .15, dur: .04 });
    knock({ at: .52, f: 1150, q: 1.6, vol: .12, dur: .04 });
    if (n > 2) {
      knock({ at: .24, f: 1650, q: 1.3, vol: .16, dur: .04 });
      knock({ at: .44, f: 1050, q: 1.4, vol: .12, dur: .04 });
    }
  },
  land() {
    knock({ f: 900, q: 1.8, vol: .44, dur: .07 });
    knock({ at: .05, f: 640, q: 2.4, vol: .3, dur: .06 });
    tone({ f: 150, to: 70, dur: .16, vol: .18, type: 'sine', lp: 400 });
  },
  // consecutive rolls climb the chord rather than repeating a pitch
  add(n: number) { bell({ f: chordTone(Math.max(n, 1) - 1, 1), vol: .13, dur: .85 }); },
  struck() {
    duck(.28, .9);
    const root = chordNow().b;
    tone({ f: root * 2, to: root * 0.94, dur: .4, vol: .34, type: 'triangle', lp: 850 });
    knock({ f: 400, q: .8, vol: .26, dur: .2 });
  },
  wipe() {
    duck(.55, 1.9);
    const root = chordNow().b;
    tone({ f: root * 2, to: root / 2, dur: 1.1, vol: .4, type: 'sawtooth', lp: 520 });
    tone({ at: .18, f: root, to: root / 2.2, dur: .9, vol: .26, type: 'triangle', lp: 440 });
    knock({ f: 260, q: .6, vol: .36, dur: .55 });
  },
  // each bank starts one step further up the chord than the last
  bank() {
    duck(.2, .7);
    const s = walk('bank', 5, 30000);
    knock({ f: 600, q: 1.5, vol: .4, dur: .06 });
    bell({ at: .02, f: chordTone(s, 1), vol: .13, dur: .8 });
    bell({ at: .10, f: chordTone(s + 1, 1), vol: .12, dur: .9 });
    bell({ at: .19, f: chordTone(s + 2, 1), vol: .10, dur: 1.1 });
  },
  pass() { bell({ f: shift(chordNow().b) * (walk('pass', 2, 9000) ? 4 : 6), vol: .05, dur: .5 }); },
  milestone() {
    duck(.45, 2.2);
    [0, 2, 4, 6].forEach((d, i) => { bell({ at: i * .1, f: chordTone(d, 1), vol: .15, dur: 1.5 }); });
  },
  take() {
    const s = walk('take', 4, 20000);
    knock({ f: 520, q: 1.4, vol: .34, dur: .07 });
    bell({ at: .03, f: chordTone(s, 2), vol: .15, dur: 1.2 });
    bell({ at: .14, f: chordTone(s + 2, 2), vol: .11, dur: 1.4 });
  },
  card: cardSound,
  shield() {
    duck(.3, 1.1);
    bell({ f: 1174.66, vol: .2, dur: 1.6 });
    bell({ at: .06, f: 1567.98, vol: .13, dur: 1.3 });
    knock({ f: 2400, q: 2.2, vol: .16, dur: .05 });
  },
  warm() {
    bell({ f: chordTone(2, 2), vol: .13, dur: .7 });
    bell({ at: .09, f: chordTone(4, 2), vol: .1, dur: .8 });
  },
  levy() {
    duck(.3, 1.2);
    tone({ f: 392, to: 196, dur: .45, vol: .26, type: 'triangle', lp: 1200 });
    bell({ at: .2, f: 659.25, vol: .16, dur: 1.1 });
  },
  transmute() {
    duck(.25, 1.2);
    [523.25, 659.25, 880.00, 1174.66].forEach((f, i) => { bell({ at: i * .06, f, vol: .12, dur: 1.3 }); });
  },
  ward() {
    duck(.3, 1.0);
    tone({ f: 220, to: 110, dur: .5, vol: .3, type: 'square', lp: 700 });
    knock({ f: 340, q: 1.1, vol: .24, dur: .22 });
  },
  warlord() {
    duck(.4, 1.4);
    const ch = chordNow().n;
    knock({ f: 420, q: 1.1, vol: .4, dur: .1 });
    [ch[0], ch[1], ch[2], ch[3]].forEach((f, i) => { bell({ at: i * .07, f: f * 2, vol: .16, dur: 1.5 }); });
  },
  win() {
    duck(.4, 2.4);
    [0, 1, 2, 3, 5].forEach((d, i) => { bell({ at: i * .13, f: chordTone(d, 1), vol: .16, dur: 1.6 }); });
  },
  lose() {
    duck(.4, 2.4);
    [3, 2, 1, 0].forEach((d, i) => { tone({ at: i * .15, f: chordTone(d, 0), dur: .6, vol: .2, type: 'triangle', lp: 1400 }); });
  }
};

type SfxName = keyof typeof SFX;
type ArgOf<K extends SfxName> = Parameters<(typeof SFX)[K]>;

export function play<K extends SfxName>(name: K, ...arg: ArgOf<K>): void {
  if (A.sfxLevel <= 0) return;
  try { (SFX[name] as (...a: unknown[]) => void)(...arg); } catch { /* audio is never fatal */ }
}
