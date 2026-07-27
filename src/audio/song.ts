import type { Inst } from './instruments';

/* =====================================================================
   THE SONG
   Written out rather than improvised. The old score picked its melody
   notes at random inside a scale, which is why it wandered and
   occasionally landed somewhere unpleasant — a random walk over a chord
   is not a tune, and no amount of reverb makes it one.

   Everything below is in scale degrees of A natural minor, where 0 is
   the A below middle C and 7 is the octave above it. One row per eighth
   note; a track shorter than the pattern simply loops inside it, which
   is how the three-note arp keeps sliding against the four-four.
   ===================================================================== */

/** Semitones from the root, for the seven degrees. */
export const SCALE = [0, 2, 3, 5, 7, 8, 10];
export const ROOT = 110;      // A2

/** Rest. Anything below zero is silence. */
export const R = -1;

export function hz(deg: number): number {
  const oct = Math.floor(deg / 7);
  const s = SCALE[((deg % 7) + 7) % 7];
  return ROOT * Math.pow(2, oct + s / 12);
}

export interface Track {
  inst: Inst;
  /** One entry per eighth. Loops if shorter than the pattern. */
  n: number[];
  /** Peak gain of a note here. */
  vel: number;
  /** Length of a note, in eighths. */
  len: number;
  /** Read `n` as a step through the bar's chord rather than the scale. */
  chordal?: boolean;
  /** Shift every note by this many degrees. */
  up?: number;
}

export interface Pattern {
  /** One chord per bar, as scale degrees. */
  chords: number[][];
  tracks: Track[];
}

/* Chords of A natural minor, by the degrees they are built from. */
const Am = [0, 2, 4];
const Dm = [3, 5, 7];
const Em = [4, 6, 8];
const F  = [5, 7, 9];
const C  = [2, 4, 6];
const G  = [6, 8, 10];

/** Whole-bar chord, held. Always there, never in the way. */
const PAD: Track = { inst: 'pad', n: [0, R, R, R, R, R, R, R], vel: 0.105, len: 8, chordal: true, up: 7 };
const PAD3: Track = { inst: 'pad', n: [1, R, R, R, R, R, R, R], vel: 0.082, len: 8, chordal: true, up: 7 };
const PAD5: Track = { inst: 'pad', n: [2, R, R, R, R, R, R, R], vel: 0.068, len: 8, chordal: true, up: 7 };

/** Root, root, fifth — a walk, not a pulse. */
const BASS: Track = { inst: 'bass', n: [0, R, R, R, 0, R, R, 2], vel: 0.30, len: 2, chordal: true };

/** Three notes against eight, so it never repeats where you expect. */
const ARP: Track = { inst: 'arp', n: [0, 1, 2], vel: 0.075, len: 1, chordal: true, up: 14 };

export const PATTERNS: Pattern[] = [
  // A — the tune. Am F C G.
  {
    chords: [Am, F, C, G],
    tracks: [
      PAD, PAD3, PAD5, BASS, ARP,
      {
        inst: 'lead', vel: 0.19, len: 3,
        n: [
          14, R, R, 16, 15, R, R, 14,
          13, R, 14, R, R, 16, R, R,
          15, R, R, 16, 18, R, 17, R,
          16, R, 14, R, R, R, 13, R
        ]
      },
      { inst: 'bell', vel: 0.10, len: 8, n: [R, R, R, R, R, R, 21, R, R, R, R, R, R, R, R, R] }
    ]
  },

  // B — the answer. Am Dm F Em: a step down, and it does not resolve.
  {
    chords: [Am, Dm, F, Em],
    tracks: [
      PAD, PAD3, PAD5, BASS, ARP,
      {
        inst: 'lead', vel: 0.19, len: 3,
        n: [
          18, R, 17, R, 16, R, R, R,
          17, R, R, 15, 14, R, R, R,
          16, R, 15, R, 14, R, 13, R,
          15, R, R, R, 14, R, R, R
        ]
      },
      { inst: 'bell', vel: 0.095, len: 8, n: [R, R, R, R, R, R, R, R, 21, R, R, R, R, R, R, R] }
    ]
  },

  // C — the turn. Same harmony as A, the tune an octave up and thinner,
  // so the loop lifts once before it goes round again.
  {
    chords: [Am, F, C, G],
    tracks: [
      PAD, PAD5, BASS, ARP,
      {
        inst: 'lead', vel: 0.14, len: 2,
        n: [
          21, R, 20, R, 18, R, 17, R,
          R, 16, R, 18, 17, R, R, R,
          18, R, 19, R, 16, R, 15, R,
          14, R, R, R, R, R, R, R
        ]
      },
      { inst: 'bell', vel: 0.115, len: 10, n: [R, R, 23, R, R, R, R, R, R, R, R, R, R, R, R, R] }
    ]
  },

  // Rest — where the loop breathes. Two bars, almost nothing in them.
  {
    chords: [Am, Em],
    tracks: [
      PAD, PAD3,
      { inst: 'bass', n: [0, R, R, R, R, R, R, R], vel: 0.24, len: 4, chordal: true },
      { inst: 'bell', vel: 0.09, len: 12, n: [R, R, R, R, 21, R, R, R] }
    ]
  }
];

/** Which pattern follows which. Sixteen bars before anything repeats. */
export const ORDER = [0, 0, 1, 2, 0, 1, 3];

export function barsOf(p: Pattern): number {
  return p.chords.length;
}
