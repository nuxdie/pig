import type { Inst } from './instruments';

/* =====================================================================
   THE SONGS
   Seven opponents, seven tunes. There used to be one song here, and
   every foe got it transposed a few semitones and taken a little faster
   — which is not a theme, it is the same theme wearing a hat. Sitting
   down against the Devil should not sound like sitting down against the
   publican who banks the moment he is ahead.

   So each of them has their own: their own mode, their own harmony,
   their own melody, their own idea of what a bar is for. What they
   share is the vocabulary underneath — the five voices in
   `instruments.ts`, the pad that is always there and never in the way,
   and a bass that walks rather than pulses. A house style, played by
   seven different hands.

   Everything is written in scale degrees, where 0 is the root and 7 is
   the octave above it, so a melody is a shape rather than a pitch and
   the same line reads the same in any of the modes below. One row per
   eighth note; a track shorter than the pattern loops inside it, which
   is how a three-note figure keeps sliding against four-four.
   ===================================================================== */

/** Rest. Anything below zero is silence. */
export const R = -1;

export const ROOT = 110;      // A2, before the song's own transposition

/* ---------------- modes ----------------
   Seven degrees each, in semitones. The character of a foe is mostly
   decided right here, before a single note is written. */
const AEOLIAN  = [0, 2, 3, 5, 7, 8, 10];   // the plain minor: home
const DORIAN   = [0, 2, 3, 5, 7, 9, 10];   // minor with a bright sixth
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];   // the flat second: old, and cold
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];   // the leading tone bites
const UKRAINE  = [0, 2, 3, 6, 7, 9, 10];   // dorian with a raised fourth
const SPANISH  = [0, 1, 4, 5, 7, 8, 10];   // phrygian dominant: the devil's

export function hz(deg: number, scale: number[]): number {
  const oct = Math.floor(deg / 7);
  const s = scale[((deg % 7) + 7) % 7];
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

export interface Song {
  /** Semitones from A, so each foe sits in their own register. */
  semi: number;
  bpm: number;
  /** How bright their room is allowed to get. */
  air: number;
  scale: number[];
  /** How far off the grid the offbeats fall, 0 … 0.12. */
  swing: number;
  patterns: Pattern[];
  /** Which pattern follows which, before anything repeats. */
  order: number[];
}

/* ---------------- the shared furniture ----------------
   Every song wants a pad, a bass and usually an arp. They are written
   once, chordally, so they follow whatever harmony is laid over them. */

const pad = (step: number, vel: number): Track =>
  ({ inst: 'pad', n: [step, R, R, R, R, R, R, R], vel, len: 8, chordal: true, up: 7 });

const PAD = pad(0, 0.105);
const PAD3 = pad(1, 0.082);
const PAD5 = pad(2, 0.068);

/** Root, root, fifth — a walk, not a pulse. */
const BASS: Track = { inst: 'bass', n: [0, R, R, R, 0, R, R, 2], vel: 0.30, len: 2, chordal: true };
/** The same walk with all the weight on the front of the bar. */
const BASS_HEAVY: Track = { inst: 'bass', n: [0, R, R, R, R, R, R, R], vel: 0.34, len: 4, chordal: true };
/** Three to the bar, so the four-four over it never quite lines up. */
const BASS_THREE: Track = { inst: 'bass', n: [0, R, R, 2, R, R], vel: 0.27, len: 2, chordal: true };

/** Three notes against eight, so it never repeats where you expect. */
const ARP: Track = { inst: 'arp', n: [0, 1, 2], vel: 0.075, len: 1, chordal: true, up: 14 };
/** Five against eight: the same trick, wound tighter. */
const ARP5: Track = { inst: 'arp', n: [0, 1, 2, 1, 3], vel: 0.07, len: 1, chordal: true, up: 14 };

/* ---------------- 1. THE PUBLICAN ----------------
   Nervous, and banks the moment he is ahead. Dorian, because the bright
   sixth keeps it from ever sounding grave, and a tune that will not sit
   still — short notes, repeated, always hopping back up to safety. The
   least frightening thing on the circuit, and it knows it. */
const PUBLICAN: Song = {
  semi: 0, bpm: 86, air: 1.00, scale: DORIAN, swing: 0.07,
  patterns: [
    {
      chords: [[0, 2, 4], [3, 5, 7], [0, 2, 4], [4, 6, 8]],
      tracks: [
        PAD, PAD3, BASS, ARP,
        {
          inst: 'lead', vel: 0.18, len: 1,
          n: [
            14, R, 14, 16, R, 14, R, R,
            16, R, 16, 17, R, 16, R, R,
            14, R, 14, 12, R, 11, R, R,
            13, R, 14, R, 11, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.09, len: 7, n: [R, R, R, R, R, R, R, R, R, R, 21, R, R, R, R, R] }
      ]
    },
    {
      // the same skip, one step higher and half a beat late — a fidget
      chords: [[3, 5, 7], [0, 2, 4], [4, 6, 8], [0, 2, 4]],
      tracks: [
        PAD, PAD5, BASS, ARP,
        {
          inst: 'lead', vel: 0.17, len: 1,
          n: [
            R, 17, R, 17, 16, R, 14, R,
            R, 16, R, 16, 14, R, 12, R,
            R, 18, R, 17, 16, R, R, 14,
            13, R, R, 12, R, R, R, R
          ]
        }
      ]
    },
    {
      // where he counts his money
      chords: [[0, 2, 4], [4, 6, 8]],
      tracks: [PAD, PAD3, BASS_HEAVY, { inst: 'bell', vel: 0.085, len: 10, n: [R, R, R, R, 19, R, R, R] }]
    }
  ],
  order: [0, 0, 1, 0, 1, 2]
};

/* ---------------- 2. THE WHEELWRIGHT ----------------
   A working song. Plain minor, a tune built out of one turning figure
   that comes round again a little further on each time, and an arp that
   never stops — the wheel is the whole idea. */
const WHEELWRIGHT: Song = {
  semi: 2, bpm: 90, air: 0.98, scale: AEOLIAN, swing: 0.04,
  patterns: [
    {
      chords: [[0, 2, 4], [5, 7, 9], [2, 4, 6], [6, 8, 10]],
      tracks: [
        PAD, PAD3, PAD5, BASS, ARP5,
        {
          inst: 'lead', vel: 0.185, len: 2,
          n: [
            14, 15, 16, R, 15, R, 14, R,
            16, 17, 18, R, 17, R, 16, R,
            18, 19, 20, R, 19, R, 18, R,
            17, R, 16, R, 15, R, 14, R
          ]
        },
        { inst: 'bell', vel: 0.10, len: 8, n: [R, R, R, R, R, R, R, R, R, R, R, R, 21, R, R, R] }
      ]
    },
    {
      // the wheel catching on something
      chords: [[3, 5, 7], [3, 5, 7], [4, 6, 8], [4, 6, 8]],
      tracks: [
        PAD, PAD3, BASS, ARP5,
        {
          inst: 'lead', vel: 0.175, len: 2,
          n: [
            17, R, 16, 17, R, 16, R, 15,
            17, R, 16, 17, R, 16, R, 15,
            16, R, 15, 16, R, 15, R, 14,
            16, R, 15, 14, R, R, R, R
          ]
        }
      ]
    },
    {
      chords: [[0, 2, 4], [0, 2, 4]],
      tracks: [PAD, PAD5, BASS_HEAVY, ARP, { inst: 'bell', vel: 0.09, len: 12, n: [R, R, R, R, R, R, 23, R] }]
    }
  ],
  order: [0, 0, 1, 0, 0, 1, 2]
};

/* ---------------- 3. THE REEVE ----------------
   He starts with points already on the board, and the music does the
   same: a march that is under way before you sit down. Low, plain, four
   square, and it does not hurry for you. */
const REEVE: Song = {
  semi: -3, bpm: 80, air: 1.02, scale: AEOLIAN, swing: 0.02,
  patterns: [
    {
      chords: [[0, 2, 4], [0, 2, 4], [5, 7, 9], [4, 6, 8]],
      tracks: [
        PAD, PAD3, BASS_HEAVY,
        {
          inst: 'lead', vel: 0.20, len: 4,
          n: [
            14, R, R, R, 14, R, R, R,
            16, R, R, R, 15, R, R, R,
            17, R, R, R, 17, R, R, R,
            16, R, R, R, R, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.105, len: 9, n: [21, R, R, R, R, R, R, R] }
      ]
    },
    {
      chords: [[3, 5, 7], [2, 4, 6], [5, 7, 9], [0, 2, 4]],
      tracks: [
        PAD, PAD3, PAD5, BASS_HEAVY, ARP,
        {
          inst: 'lead', vel: 0.19, len: 3,
          n: [
            17, R, R, 16, 17, R, R, R,
            16, R, R, 15, 16, R, R, R,
            19, R, R, 18, 17, R, R, R,
            14, R, R, R, R, R, R, R
          ]
        }
      ]
    },
    {
      chords: [[0, 2, 4], [4, 6, 8]],
      tracks: [PAD, BASS_HEAVY, { inst: 'bell', vel: 0.10, len: 12, n: [R, R, R, R, 18, R, R, R] }]
    }
  ],
  order: [0, 0, 1, 0, 1, 2]
};

/* ---------------- 4. THE ALCHEMIST ----------------
   Tin and silver in hand before the bell. The raised fourth is the
   whole character — every phrase reaches for a note that should not be
   there and gets away with it. Quick, bright, and slightly wrong. */
const ALCHEMIST: Song = {
  semi: 5, bpm: 94, air: 0.92, scale: UKRAINE, swing: 0.05,
  patterns: [
    {
      chords: [[0, 2, 4], [3, 5, 0], [0, 2, 4], [6, 8, 10]],
      tracks: [
        PAD, PAD3, BASS, ARP5,
        {
          inst: 'lead', vel: 0.18, len: 2,
          n: [
            14, R, 17, R, 16, R, 14, R,
            17, R, 20, R, 19, R, 17, R,
            18, R, 17, R, 14, R, 13, R,
            R, 14, R, 17, 16, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.10, len: 6, n: [R, R, 24, R, R, R, R, R, R, R, R, R, 23, R, R, R] }
      ]
    },
    {
      // the mixture taking
      chords: [[3, 5, 0], [4, 6, 8], [2, 4, 6], [0, 2, 4]],
      tracks: [
        PAD, PAD5, BASS, ARP5,
        {
          inst: 'lead', vel: 0.165, len: 1,
          n: [
            21, 20, 19, 18, 17, R, R, R,
            18, 19, 20, 21, R, 20, R, R,
            19, 18, 17, 16, 15, R, R, R,
            16, R, 14, R, R, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.09, len: 7, n: [R, R, R, R, R, R, R, R, 25, R, R, R, R, R, R, R] }
      ]
    },
    {
      chords: [[0, 2, 4], [3, 5, 0]],
      tracks: [PAD, PAD3, BASS_HEAVY, ARP, { inst: 'bell', vel: 0.095, len: 11, n: [R, R, R, R, R, 23, R, R] }]
    }
  ],
  order: [0, 1, 0, 1, 0, 2]
};

/* ---------------- 5. THE ABBOT ----------------
   Three cards deep, and ahead of you before you begin. Phrygian, which
   is a very old sound, and a melody that mostly walks by step the way
   plainchant does — the bell is the loudest thing in it. Nothing here
   is in a hurry, and nothing here is on your side. */
const ABBOT: Song = {
  semi: -1, bpm: 76, air: 1.08, scale: PHRYGIAN, swing: 0.01,
  patterns: [
    {
      chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [4, 6, 8]],
      tracks: [
        PAD, PAD3, PAD5, BASS_HEAVY,
        {
          inst: 'lead', vel: 0.175, len: 4,
          n: [
            14, R, R, R, 15, R, R, R,
            16, R, R, R, 15, R, R, R,
            14, R, R, R, 13, R, R, R,
            14, R, R, R, R, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.135, len: 14, n: [21, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R] }
      ]
    },
    {
      // the response, a fourth up, as though answered from the other side
      chords: [[3, 5, 0], [1, 3, 5], [4, 6, 8], [0, 2, 4]],
      tracks: [
        PAD, PAD3, BASS_HEAVY,
        {
          inst: 'lead', vel: 0.17, len: 4,
          n: [
            17, R, R, R, 18, R, R, R,
            19, R, R, R, 18, R, R, R,
            17, R, R, R, 16, R, R, R,
            15, R, R, R, 14, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.12, len: 14, n: [R, R, R, R, R, R, R, R, 22, R, R, R, R, R, R, R] }
      ]
    },
    {
      chords: [[0, 2, 4], [1, 3, 5]],
      tracks: [PAD, PAD3, PAD5, { inst: 'bell', vel: 0.115, len: 16, n: [R, R, R, R, 15, R, R, R] }]
    }
  ],
  order: [0, 1, 0, 2, 0, 1]
};

/* ---------------- 6. THE EXECUTIONER ----------------
   Two gold cards and no hurry at all. Harmonic minor, so the seventh
   leans on the root every time it passes; the tune is a mechanism
   rather than a melody, and the bass goes three to the bar against a
   five-note arp so nothing ever quite lines up. Brisk, and entirely
   without malice, which is the worst part. */
const EXECUTIONER: Song = {
  semi: 3, bpm: 98, air: 0.84, scale: HARMONIC, swing: 0.0,
  patterns: [
    {
      chords: [[0, 2, 4], [0, 2, 4], [4, 6, 1], [4, 6, 1]],
      tracks: [
        PAD, PAD3, BASS_THREE, ARP5,
        {
          inst: 'lead', vel: 0.19, len: 1,
          n: [
            14, R, 16, R, 18, R, 16, R,
            14, R, 16, R, 18, R, 20, R,
            18, R, 20, R, 21, R, 20, R,
            18, R, 16, R, 14, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.105, len: 5, n: [R, R, R, R, R, R, R, 20, R, R, R, R, R, R, R, R] }
      ]
    },
    {
      // the same machine, one tooth further round
      chords: [[3, 5, 0], [3, 5, 0], [4, 6, 1], [0, 2, 4]],
      tracks: [
        PAD, PAD5, BASS_THREE, ARP5,
        {
          inst: 'lead', vel: 0.185, len: 1,
          n: [
            17, R, 19, R, 21, R, 19, R,
            17, R, 19, R, 17, R, 16, R,
            18, R, 20, R, 21, R, 20, R,
            14, R, 13, R, 14, R, R, R
          ]
        }
      ]
    },
    {
      // it does not rest. it idles.
      chords: [[0, 2, 4], [4, 6, 1]],
      tracks: [
        PAD, BASS_THREE, ARP,
        { inst: 'bell', vel: 0.10, len: 8, n: [R, R, R, R, R, R, 21, R] }
      ]
    }
  ],
  order: [0, 0, 1, 0, 1, 1, 2]
};

/* ---------------- 7. THE DEVIL ----------------
   A saint's die, two gold, and a lead. Phrygian dominant — the flat
   second against the major third, which is the oldest cheap trick in
   music and still works. Slow, low, and made of wide intervals: the
   melody drops an octave where the others would step. What passes for
   its rest pattern is a held breath on the flat second. */
const DEVIL: Song = {
  semi: -5, bpm: 70, air: 1.16, scale: SPANISH, swing: 0.0,
  patterns: [
    {
      chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [1, 3, 5]],
      tracks: [
        PAD, PAD3, PAD5, BASS_HEAVY,
        {
          inst: 'lead', vel: 0.205, len: 3,
          n: [
            14, R, R, R, 15, R, 14, R,
            R, R, 11, R, R, R, R, R,
            16, R, R, R, 15, R, 14, R,
            R, 8, R, R, R, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.14, len: 16, n: [R, R, R, R, R, R, R, R, R, R, R, R, 22, R, R, R] }
      ]
    },
    {
      // the octave drop, twice, and then it simply stops
      chords: [[5, 0, 2], [4, 6, 1], [0, 2, 4], [0, 2, 4]],
      tracks: [
        PAD, PAD3, BASS_HEAVY, ARP,
        {
          inst: 'lead', vel: 0.20, len: 4,
          n: [
            19, R, R, R, 12, R, R, R,
            18, R, R, R, 11, R, R, R,
            16, R, 15, R, 14, R, R, R,
            R, R, R, R, R, R, R, R
          ]
        },
        { inst: 'bell', vel: 0.13, len: 16, n: [R, R, R, R, R, R, R, R, R, R, R, R, R, R, 8, R] }
      ]
    },
    {
      chords: [[1, 3, 5], [1, 3, 5]],
      tracks: [
        PAD, PAD3, PAD5,
        { inst: 'bass', n: [0, R, R, R, R, R, R, R], vel: 0.36, len: 8, chordal: true },
        { inst: 'bell', vel: 0.12, len: 16, n: [R, R, R, R, R, R, R, R, 15, R, R, R, R, R, R, R] }
      ]
    }
  ],
  order: [0, 0, 1, 2, 0, 1, 1]
};

/** In circuit order. `music.ts` picks by rung. */
export const SONGS: Song[] = [
  PUBLICAN, WHEELWRIGHT, REEVE, ALCHEMIST, ABBOT, EXECUTIONER, DEVIL
];

export function barsOf(p: Pattern): number {
  return p.chords.length;
}
