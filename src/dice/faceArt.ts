import { PIPS } from '../lib/dice';
import type { Die, DieId } from '../lib/types';

/* =====================================================================
   THE FACES
   A die's six faces are drawn once, into one atlas, and the atlas is
   what makes the pips look sunk. Everything starts as a *height field*:
   a grey image where white is the untouched surface and black is the
   bottom of the cut. Blur it a little and you have the wall of the pit;
   differentiate it and you have a normal map; blur it a lot and you have
   the ambient occlusion that sits in the bottom of the hole. The pip
   colour is paint in that hole, not a ball on top of it.

   Because everything is a cut in the same height field, a pip and a
   devil's face cost the same to draw — which is the whole reason the
   special dice can carry real artwork.

   THE EMBLEM RULE. A die's mark always *replaces* a pip: the lone pip on
   a 1-face, or the middle pip of a 3 or a 5. It never adds one. Counting
   the face still works, which matters more than the flourish does.
   ===================================================================== */

const TAU = Math.PI * 2;

/** One face's tile. 192 is ~5x what a face covers on the smallest phone. */
const TILE = 192;
const COLS = 3;
const ROWS = 2;
const ATLAS_W = TILE * COLS;
const ATLAS_H = TILE * ROWS;

/** Pip grid, in face units — a face spans -0.5 … 0.5. */
const PIP_STEP = 0.255;
const PIP_R = 0.10;

/** How deep the deepest cut goes, in world units. Sets the normal strength. */
const DEPTH = 0.05;

/** Blur radii, as a fraction of a tile. */
const SOFTEN = 0.016;   // the wall of a cut
const AO_BLUR = 0.038;  // how far the shadow in a cut spills

const AO_ON_COLOUR = 0.66;
const AO_ON_ENV = 0.85;

const px = (f: number) => Math.max(1, Math.round(TILE * f));

/**
 * Face-local (a, b) — both in -0.5 … 0.5, u to the right and v up — to a
 * uv inside the atlas. The geometry is the only other thing that needs to
 * know how the tiles are laid out, and it asks here.
 */
export function faceUv(slot: number, a: number, b: number): [number, number] {
  const cx = (slot % COLS) * TILE;
  const cy = Math.floor(slot / COLS) * TILE;
  return [
    (cx + (a + 0.5) * TILE) / ATLAS_W,
    1 - (cy + (0.5 - b) * TILE) / ATLAS_H
  ];
}

/* ----------------------------- the palette ----------------------------- */

type PipStyle = 'round' | 'rough' | 'ring';
type Emblem = 'devil' | 'crown' | 'cross' | 'hallmark' | 'chisel' | 'gouge' | 'rosette' | 'scrawl';
type Surface = 'grind' | 'craze' | 'cast' | 'grubby' | 'scorch' | 'dust' | 'gild';

interface Art {
  /** The face itself. */
  base: string;
  /** Mottling drawn over it, so the surface is never a flat colour. */
  grain: string;
  /** What the edges go when they have been handled for years. */
  edge: string;
  /** Paint in the engraving, and what it goes on a 1-face. */
  pip: string;
  pipOne: string;
  style: PipStyle;
  /** The die's mark, in place of a pip. */
  emblem: Emblem | null;
  surface: Surface | null;
  /** An incised ring around every pip. */
  halo: string | null;
  /** Scratches and scuffs, 0 … 1. */
  wear: number;
  /** Roughness of the flat face and of the worn edges, as map multipliers. */
  rough: [number, number];
  /** Roughness and metalness inside the cut, as map multipliers. */
  cut: [number, number];
  /** Metalness of the face itself, as a map multiplier. */
  metal: number;
  /** Embers. Only the devil has any. */
  glow: string | null;
}

const BONE: Art = {
  base: '#ddcea5', grain: '#c2ad7e', edge: '#efe6cb',
  pip: '#191d16', pipOne: '#9c2e24',
  style: 'round', emblem: null, surface: null, halo: null,
  wear: 0.5, rough: [1, 0.74], cut: [1, 0], metal: 1, glow: null
};

const ART: Record<DieId, Art> = {
  plain: BONE,

  // Ground on a stone and it looks it: grey, honed, striped by the wheel.
  whet: {
    base: '#979a8c', grain: '#7a7d71', edge: '#bcbfb4',
    pip: '#1f231d', pipOne: '#8d3225',
    style: 'round', emblem: 'chisel', surface: 'grind', halo: null,
    wear: 0.6, rough: [0.92, 0.5], cut: [1, 0], metal: 1, glow: null
  },

  // Cast, not carved. Pinholes from the mould, patina in the recesses, and
  // the 1 struck with a hallmark the way a maker signs a piece.
  brass: {
    base: '#b8963f', grain: '#8a6d26', edge: '#dcbf72',
    pip: '#3d2d13', pipOne: '#7d2517',
    style: 'round', emblem: 'hallmark', surface: 'cast', halo: null,
    wear: 0.72, rough: [0.66, 0.34], cut: [1, 0.12], metal: 1, glow: null
  },

  // Cut by somebody with a bad knife and carried in a bad pocket.
  pauper: {
    base: '#aca48b', grain: '#8b836d', edge: '#c4bda8',
    pip: '#32352a', pipOne: '#32352a',
    style: 'rough', emblem: 'gouge', surface: 'grubby', halo: null,
    wear: 1, rough: [1, 0.88], cut: [1, 0], metal: 1, glow: null
  },

  // Five sixes and a single 1 — and the 1 has a face on it.
  devil: {
    base: '#4d1a14', grain: '#2d0d0b', edge: '#6d2a1e',
    pip: '#e8cbc2', pipOne: '#1a0806',
    style: 'round', emblem: 'devil', surface: 'scorch', halo: null,
    wear: 0.55, rough: [0.86, 0.5], cut: [0.9, 0], metal: 1, glow: '#ff5a1e'
  },

  // Drawn on rather than cut in: shallow chalk rings and dust everywhere.
  chalk: {
    base: '#e0e4d8', grain: '#c9cec0', edge: '#f4f6ef',
    pip: '#555b4e', pipOne: '#555b4e',
    style: 'ring', emblem: 'scrawl', surface: 'dust', halo: null,
    wear: 0.34, rough: [1, 0.94], cut: [1, 0], metal: 1, glow: null
  },

  // Old, and it shows: fine crazing all over, a scrimshaw rosette for a mark.
  ivory: {
    base: '#e6d3a4', grain: '#cdb27f', edge: '#f6ecca',
    pip: '#5a4220', pipOne: '#5a4220',
    style: 'round', emblem: 'rosette', surface: 'craze', halo: null,
    wear: 0.4, rough: [0.84, 0.46], cut: [0.95, 0], metal: 1, glow: null
  },

  // The finest die in the game: every pip haloed in gold, a cross on the odds.
  saint: {
    base: '#dee3d7', grain: '#c8cfc0', edge: '#f5f8f1',
    pip: '#2c6a4b', pipOne: '#2c6a4b',
    style: 'round', emblem: 'cross', surface: 'gild', halo: '#c9a54a',
    wear: 0.16, rough: [0.5, 0.28], cut: [0.7, 0], metal: 0.02, glow: null
  },

  // Gilded pips, an engraved border, and a crown where the middle pip was.
  crown: {
    base: '#dccb99', grain: '#c0ac76', edge: '#f2e5bd',
    pip: '#cca23a', pipOne: '#cca23a',
    style: 'round', emblem: 'crown', surface: 'gild', halo: null,
    wear: 0.3, rough: [0.72, 0.4], cut: [0.4, 0.5], metal: 0.02, glow: null
  }
};

/* ------------------------------ scaffolding ------------------------------ */

type Rng = () => number;

function rng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function surface(w: number, h: number, readBack = false): CanvasRenderingContext2D {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv.getContext('2d', { willReadFrequently: readBack })!;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * A cut in the surface. `depth` is 0 (untouched) to 1 (as deep as it goes);
 * `stroke` turns it from a filled shape into a scored line.
 */
interface Mark {
  path: Path2D;
  depth: number;
  stroke?: number;
  /** Cut it, but leave it unpainted — this is how a pit gets a bevelled wall. */
  bare?: boolean;
  /** Override what this one cut is filled with. */
  ink?: Partial<Ink>;
}

/** The four images a die is made of. */
interface Sheet {
  col: CanvasRenderingContext2D;
  hgt: CanvasRenderingContext2D;
  srf: CanvasRenderingContext2D;
  emi: CanvasRenderingContext2D | null;
}

/** What a cut is filled with, once it is made. */
interface Ink { paint: string; rough: number; metal: number; glow: number }

/** Cut the marks, then fill them — into all four images at once. */
function cut(s: Sheet, marks: Mark[], ink: Ink, art: Art): void {
  for (const m of marks) {
    const use = m.ink ? { ...ink, ...m.ink } : ink;
    const d = Math.min(1, Math.max(0, m.depth));
    const a = Math.min(1, d * 1.7);
    const draw = (c: CanvasRenderingContext2D, style: string) => {
      if (m.stroke) {
        c.strokeStyle = style; c.lineWidth = m.stroke;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.stroke(m.path);
      } else {
        c.fillStyle = style; c.fill(m.path);
      }
    };
    const v = Math.round(255 * (1 - d));
    draw(s.hgt, `rgb(${v},${v},${v})`);
    if (m.bare) continue;
    draw(s.col, rgba(use.paint, a));
    draw(s.srf, `rgba(0,${Math.round(use.rough * 255)},${Math.round(use.metal * 255)},${a})`);
    if (s.emi && art.glow && use.glow > 0) draw(s.emi, rgba(art.glow, Math.min(1, d * use.glow)));
  }
}

/* -------------------------------- the pips -------------------------------- */

function circle(x: number, y: number, r: number): Path2D {
  const p = new Path2D();
  p.arc(x, y, r, 0, TAU);
  return p;
}

/** A circle cut by an unsteady hand. */
function wobble(x: number, y: number, r: number, R: Rng, amt = 0.16): Path2D {
  const p = new Path2D();
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 - amt / 2 + R() * amt);
    const px2 = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) p.moveTo(px2, py); else p.lineTo(px2, py);
  }
  p.closePath();
  return p;
}

/**
 * A pip is two cuts, not one: the hole, and the paint that only reaches the
 * bottom of it. Leaving the wall bare is the whole trick — an all-over painted
 * disc reads as a sticker, whereas a bevel of bare surface catching the light
 * around a dark middle reads as a hole, which is what it is.
 */
function pipMarks(style: PipStyle, x: number, y: number, r: number, R: Rng): Mark[] {
  if (style === 'rough') {
    // hand-gouged: never quite round, never quite where it should be
    const ox = (R() - 0.5) * r * 0.2, oy = (R() - 0.5) * r * 0.2;
    const rr = r * (0.9 + R() * 0.18);
    return [
      { path: wobble(x + ox, y + oy, rr, R, 0.24), depth: 0.85, bare: true },
      { path: wobble(x + ox, y + oy, rr * 0.7, R, 0.3), depth: 0.9 }
    ];
  }
  if (style === 'ring') {
    // chalk: a scrawled ring, barely into the surface
    return [
      { path: circle(x, y, r * 0.72), depth: 0.45, stroke: r * 0.62, bare: true },
      { path: wobble(x, y, r * 0.72, R, 0.12), depth: 0.5, stroke: r * 0.46 }
    ];
  }
  return [
    { path: circle(x, y, r), depth: 1, bare: true },
    { path: circle(x, y, r * 0.74), depth: 1 }
  ];
}

/* ------------------------------ the emblems ------------------------------ */

/** A little scope for drawing in units of the emblem's own radius. */
function pen(x: number, y: number, r: number) {
  const P = new Path2D();
  return {
    P,
    m: (a: number, b: number) => P.moveTo(x + a * r, y + b * r),
    l: (a: number, b: number) => P.lineTo(x + a * r, y + b * r),
    q: (a: number, b: number, c: number, d: number) =>
      P.quadraticCurveTo(x + a * r, y + b * r, x + c * r, y + d * r),
    b: (a: number, b2: number, c: number, d: number, e: number, f: number) =>
      P.bezierCurveTo(x + a * r, y + b2 * r, x + c * r, y + d * r, x + e * r, y + f * r),
    dot: (a: number, b: number, rad: number) => P.arc(x + a * r, y + b * r, rad * r, 0, TAU),
    close: () => P.closePath()
  };
}

/**
 * Horns, a pointed chin, and eyes and a grin that are still lit. The head is
 * struck into the face like a seal and filled almost black; only what is
 * looking back at you glows.
 */
function devilMarks(x: number, y: number, r: number): Mark[] {
  const h = pen(x, y, r);
  h.m(-0.72, -0.30);
  h.b(-1.14, -0.52, -1.42, -0.94, -1.34, -1.44);   // left horn, out then up
  h.b(-1.14, -1.10, -0.86, -0.86, -0.34, -0.66);   // and back down the inside
  h.q(0, -0.88, 0.34, -0.66);                      // the brow between them
  h.b(0.86, -0.86, 1.14, -1.10, 1.34, -1.44);
  h.b(1.42, -0.94, 1.14, -0.52, 0.72, -0.30);
  h.b(0.92, 0.18, 0.52, 0.74, 0.00, 1.18);         // jaw down to the chin
  h.b(-0.52, 0.74, -0.92, 0.18, -0.72, -0.30);
  h.close();

  const eyes = pen(x, y, r);
  for (const s2 of [-1, 1]) {
    eyes.m(0.11 * s2, -0.32);
    eyes.q(0.45 * s2, -0.50, 0.63 * s2, -0.10);
    eyes.q(0.38 * s2, -0.04, 0.11 * s2, -0.32);
    eyes.close();
  }

  const grin = pen(x, y, r);
  grin.m(-0.48, 0.22);
  grin.q(0, 0.86, 0.48, 0.22);
  grin.l(0.30, 0.44); grin.l(0.16, 0.22);
  grin.l(0, 0.46); grin.l(-0.16, 0.22);
  grin.l(-0.30, 0.44);
  grin.close();

  return [
    { path: h.P, depth: 0.72, ink: { paint: '#160604', glow: 0 } },
    { path: eyes.P, depth: 1, ink: { paint: '#ff9042', rough: 0.6, glow: 2.6 } },
    { path: grin.P, depth: 1, ink: { paint: '#ff7526', rough: 0.6, glow: 2.2 } }
  ];
}

function crownMarks(x: number, y: number, r: number): Mark[] {
  const c = pen(x, y, r);
  c.m(-0.86, 0.62);
  c.l(-0.86, -0.52); c.l(-0.42, -0.02); c.l(0, -0.78);
  c.l(0.42, -0.02); c.l(0.86, -0.52); c.l(0.86, 0.62);
  c.close();
  const jewels = pen(x, y, r);
  jewels.dot(-0.86, -0.72, 0.15); jewels.P.closePath();
  jewels.dot(0, -0.98, 0.17); jewels.P.closePath();
  jewels.dot(0.86, -0.72, 0.15); jewels.P.closePath();
  const band = pen(x, y, r);
  band.m(-0.92, 0.24); band.l(0.92, 0.24);
  return [
    { path: c.P, depth: 0.9 },
    { path: jewels.P, depth: 1 },
    { path: band.P, depth: 0.45, stroke: r * 0.13 }
  ];
}

function crossMarks(x: number, y: number, r: number): Mark[] {
  const c = pen(x, y, r);
  c.m(-0.17, -0.98); c.l(0.17, -0.98); c.l(0.17, -0.34);
  c.l(0.78, -0.34); c.l(0.78, -0.02); c.l(0.17, -0.02);
  c.l(0.17, 0.98); c.l(-0.17, 0.98); c.l(-0.17, -0.02);
  c.l(-0.78, -0.02); c.l(-0.78, -0.34); c.l(-0.17, -0.34);
  c.close();
  return [
    { path: circle(x, y - 0.18 * r, r * 1.02), depth: 0.3, bare: true },
    { path: c.P, depth: 1 }
  ];
}

/** A maker's stamp around the 1: struck ring, ticked like a coin's edge. */
function hallmarkMarks(x: number, y: number, r: number): Mark[] {
  const ticks = new Path2D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ticks.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82);
    ticks.lineTo(x + Math.cos(a) * r * 0.99, y + Math.sin(a) * r * 0.99);
  }
  return [
    { path: circle(x, y, r * 0.72), depth: 0.35, stroke: r * 0.1 },
    { path: ticks, depth: 0.4, stroke: r * 0.08 },
    { path: circle(x, y, r * 0.46), depth: 1 }
  ];
}

/** A gash where the 1 should be, as if the die had been struck with a blade. */
function chiselMarks(x: number, y: number, r: number): Mark[] {
  const g = pen(x, y, r);
  g.m(-0.95, 0.46);
  g.q(-0.1, -0.2, 0.92, -0.52);
  g.q(0.2, 0.14, -0.95, 0.46);
  g.close();
  return [{ path: g.P, depth: 1 }];
}

/** A hole worried out of the face, with the crack it started. */
function gougeMarks(x: number, y: number, r: number, R: Rng): Mark[] {
  const crack = new Path2D();
  let cx = x + r * 0.45, cy = y + r * 0.16;
  crack.moveTo(cx, cy);
  let a = -0.3 + R();
  for (let i = 0; i < 5; i++) {
    a += (R() - 0.5) * 1.1;
    cx += Math.cos(a) * r * 0.5; cy += Math.sin(a) * r * 0.5;
    crack.lineTo(cx, cy);
  }
  return [
    { path: wobble(x, y, r * 0.66, R, 0.3), depth: 0.9, bare: true },
    { path: wobble(x, y, r * 0.5, R, 0.36), depth: 1 },
    { path: crack, depth: 0.5, stroke: r * 0.055 }
  ];
}

/** Scrimshaw: six petals scratched round a middle, the way sailors did. */
function rosetteMarks(x: number, y: number, r: number): Mark[] {
  const p = new Path2D();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const cx = x + Math.cos(a) * r * 0.52, cy = y + Math.sin(a) * r * 0.52;
    p.ellipse(cx, cy, r * 0.42, r * 0.2, a, 0, TAU);
  }
  return [
    { path: p, depth: 0.55 },
    { path: circle(x, y, r * 0.3), depth: 1 }
  ];
}

/** Three strokes of chalk crossed over each other. */
function scrawlMarks(x: number, y: number, r: number, R: Rng): Mark[] {
  const p = new Path2D();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + R() * 0.3;
    p.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    p.lineTo(x + Math.cos(a) * r * (0.85 + R() * 0.3), y + Math.sin(a) * r * (0.85 + R() * 0.3));
  }
  return [{ path: p, depth: 0.5, stroke: r * 0.22 }];
}

function emblemMarks(kind: Emblem, x: number, y: number, r: number, R: Rng): Mark[] {
  switch (kind) {
    case 'devil': return devilMarks(x, y, r);
    case 'crown': return crownMarks(x, y, r);
    case 'cross': return crossMarks(x, y, r);
    case 'hallmark': return hallmarkMarks(x, y, r);
    case 'chisel': return chiselMarks(x, y, r);
    case 'gouge': return gougeMarks(x, y, r, R);
    case 'rosette': return rosetteMarks(x, y, r);
    case 'scrawl': return scrawlMarks(x, y, r, R);
  }
}

/* ------------------------------ the surface ------------------------------ */

/** Mottling, so no face is ever a flat colour. */
function grain(s: Sheet, cx: number, cy: number, art: Art, R: Rng): void {
  for (let i = 0; i < 46; i++) {
    const x = cx + R() * TILE, y = cy + R() * TILE;
    const rr = TILE * (0.04 + R() * 0.16);
    const g = s.col.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgba(R() < 0.72 ? art.grain : art.edge, 0.09 + R() * 0.12));
    g.addColorStop(1, rgba(art.grain, 0));
    s.col.fillStyle = g;
    s.col.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}

/**
 * Edges are where a die is actually held, so they lose their colour and gain
 * their shine. This band lands on the fillet, because the texture is mapped
 * across the whole cube face and the rounded corner takes the outside of it.
 */
function edgeWear(s: Sheet, cx: number, cy: number, art: Art, R: Rng): void {
  const band = TILE * 0.2;
  const worn = Math.round(art.rough[1] * 255);
  const metal = Math.round(art.metal * 255);
  const runs: [number, number, number, number][] = [
    [cx, cy, cx, cy + band],
    [cx, cy + TILE, cx, cy + TILE - band],
    [cx, cy, cx + band, cy],
    [cx + TILE, cy, cx + TILE - band, cy]
  ];
  for (const [x0, y0, x1, y1] of runs) {
    const a = 0.05 + art.wear * 0.15;
    const g = s.col.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(art.edge, a));
    g.addColorStop(1, rgba(art.edge, 0));
    s.col.fillStyle = g;
    s.col.fillRect(cx, cy, TILE, TILE);

    const g2 = s.srf.createLinearGradient(x0, y0, x1, y1);
    g2.addColorStop(0, `rgba(0,${worn},${metal},0.9)`);
    g2.addColorStop(1, `rgba(0,${worn},${metal},0)`);
    s.srf.fillStyle = g2;
    s.srf.fillRect(cx, cy, TILE, TILE);
  }
  // corners take the worst of it, and lose a little material with it
  for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = cx + ox * TILE, y = cy + oy * TILE;
    const rr = TILE * (0.16 + R() * 0.12);
    const g = s.col.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgba(art.edge, 0.1 + art.wear * 0.16));
    g.addColorStop(1, rgba(art.edge, 0));
    s.col.fillStyle = g;
    s.col.fillRect(cx, cy, TILE, TILE);
    if (R() < art.wear * 0.6) {
      cut(s, [{ path: wobble(x, y, TILE * (0.02 + R() * 0.03), R, 0.5), depth: 0.3 }],
        { paint: art.grain, rough: art.rough[0], metal: art.metal, glow: 0 }, art);
    }
  }
}

/** Scratches: shallow, everywhere, and the honest record of being used. */
function scratches(s: Sheet, cx: number, cy: number, art: Art, R: Rng): void {
  const n = Math.round(30 * art.wear);
  for (let i = 0; i < n; i++) {
    const x = cx + R() * TILE, y = cy + R() * TILE;
    const a = R() * TAU;
    const len = TILE * (0.05 + R() * 0.3);
    const p = new Path2D();
    p.moveTo(x, y);
    p.quadraticCurveTo(
      x + Math.cos(a + 0.3) * len * 0.5, y + Math.sin(a + 0.3) * len * 0.5,
      x + Math.cos(a) * len, y + Math.sin(a) * len
    );
    const deep = R() < 0.18;
    cut(s, [{ path: p, depth: deep ? 0.35 : 0.12, stroke: TILE * (deep ? 0.008 : 0.005) }],
      { paint: deep ? art.grain : art.edge, rough: art.rough[1], metal: art.metal, glow: 0 }, art);
  }
}

/** A jagged line, for cracks and crazing and ember seams. */
function fracture(x: number, y: number, len: number, R: Rng, jitter = 0.9): Path2D {
  const p = new Path2D();
  p.moveTo(x, y);
  let a = R() * TAU;
  let cx = x, cy = y;
  const steps = 5 + Math.floor(R() * 4);
  for (let i = 0; i < steps; i++) {
    a += (R() - 0.5) * jitter;
    cx += Math.cos(a) * (len / steps);
    cy += Math.sin(a) * (len / steps);
    p.lineTo(cx, cy);
  }
  return p;
}

function surfaceArt(s: Sheet, cx: number, cy: number, art: Art, R: Rng): void {
  const ink = (paint: string, rough = art.rough[0], glow = 0): Ink =>
    ({ paint, rough, metal: art.metal, glow });

  switch (art.surface) {
    case 'grind': {
      // the wheel left its stripes, all running the same way
      const a = 0.35 + R() * 0.2;
      for (let i = 0; i < 52; i++) {
        const x = cx + R() * TILE, y = cy + R() * TILE;
        const len = TILE * (0.15 + R() * 0.55);
        const p = new Path2D();
        p.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2);
        p.lineTo(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2);
        cut(s, [{ path: p, depth: 0.1, stroke: TILE * 0.005 }],
          ink(R() < 0.5 ? art.edge : art.grain, art.rough[1]), art);
      }
      break;
    }
    case 'craze': {
      // age, in hairlines
      for (let i = 0; i < 9; i++) {
        const p = fracture(cx + R() * TILE, cy + R() * TILE, TILE * (0.3 + R() * 0.5), R, 1.3);
        cut(s, [{ path: p, depth: 0.22, stroke: TILE * 0.004 }], ink(art.grain), art);
      }
      break;
    }
    case 'cast': {
      // pinholes from the mould, and the seam where the halves met
      for (let i = 0; i < 16; i++) {
        const rr = TILE * (0.005 + R() * 0.011);
        cut(s, [{ path: circle(cx + R() * TILE, cy + R() * TILE, rr), depth: 0.5 }],
          ink(art.grain), art);
      }
      if (R() < 0.5) {
        const y = cy + TILE * (0.2 + R() * 0.6);
        const p = new Path2D();
        p.moveTo(cx, y); p.quadraticCurveTo(cx + TILE / 2, y + TILE * 0.03, cx + TILE, y);
        cut(s, [{ path: p, depth: 0.16, stroke: TILE * 0.012 }], ink(art.edge, art.rough[1]), art);
      }
      // patina settles wherever it likes
      for (let i = 0; i < 5; i++) {
        const x = cx + R() * TILE, y = cy + R() * TILE, rr = TILE * (0.1 + R() * 0.2);
        const g = s.col.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(86,110,74,${0.1 + R() * 0.14})`);
        g.addColorStop(1, 'rgba(86,110,74,0)');
        s.col.fillStyle = g;
        s.col.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      break;
    }
    case 'grubby': {
      // stains from thumbs, and one long split the owner cannot afford to mind
      for (let i = 0; i < 7; i++) {
        const x = cx + R() * TILE, y = cy + R() * TILE, rr = TILE * (0.12 + R() * 0.26);
        const g = s.col.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(96,84,58,${0.1 + R() * 0.16})`);
        g.addColorStop(1, 'rgba(96,84,58,0)');
        s.col.fillStyle = g;
        s.col.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      if (R() < 0.7) {
        const p = fracture(cx + R() * TILE, cy + R() * TILE, TILE * (0.5 + R() * 0.5), R, 0.7);
        cut(s, [{ path: p, depth: 0.6, stroke: TILE * 0.011 }], ink('#4a4436'), art);
      }
      break;
    }
    case 'scorch': {
      // soot, and seams that never quite went out
      for (let i = 0; i < 6; i++) {
        const x = cx + R() * TILE, y = cy + R() * TILE, rr = TILE * (0.1 + R() * 0.24);
        const g = s.col.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(18,8,6,${0.16 + R() * 0.24})`);
        g.addColorStop(1, 'rgba(18,8,6,0)');
        s.col.fillStyle = g;
        s.col.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      // two seams a face, dark cracks with only a little life left in them
      for (let i = 0; i < 2; i++) {
        const near = R() < 0.5;
        const p = fracture(
          cx + TILE * (near ? 0.06 + R() * 0.18 : 0.76 + R() * 0.18),
          cy + TILE * (0.1 + R() * 0.8),
          TILE * (0.2 + R() * 0.3), R, 1.1);
        cut(s, [{ path: p, depth: 0.5, stroke: TILE * 0.006 }],
          { paint: '#7d2a10', rough: 0.7, metal: art.metal, glow: 0.55 }, art);
      }
      break;
    }
    case 'dust': {
      for (let i = 0; i < 90; i++) {
        s.col.fillStyle = rgba('#ffffff', 0.1 + R() * 0.3);
        const rr = TILE * (0.004 + R() * 0.01);
        s.col.beginPath();
        s.col.arc(cx + R() * TILE, cy + R() * TILE, rr, 0, TAU);
        s.col.fill();
      }
      break;
    }
    case 'gild': {
      // a fine line engraved just inside the edge, gold in the groove
      const m = TILE * 0.115;
      const p = new Path2D();
      p.rect(cx + m, cy + m, TILE - m * 2, TILE - m * 2);
      cut(s, [{ path: p, depth: 0.4, stroke: TILE * 0.014 }],
        { paint: art.halo ?? art.pip, rough: 0.45, metal: art.halo ? 0.85 : art.cut[1], glow: 0 }, art);
      break;
    }
    case null:
      break;
  }
}

/* ------------------------------- the atlas ------------------------------- */

function drawFace(s: Sheet, die: Die, art: Art, slot: number, R: Rng): void {
  const value = die.faces[slot];
  const cx = (slot % COLS) * TILE;
  const cy = Math.floor(slot / COLS) * TILE;

  const clip = new Path2D();
  clip.rect(cx, cy, TILE, TILE);
  for (const c of [s.col, s.hgt, s.srf, s.emi]) {
    if (!c) continue;
    c.save();
    c.clip(clip);
  }

  grain(s, cx, cy, art, R);
  surfaceArt(s, cx, cy, art, R);
  edgeWear(s, cx, cy, art, R);
  scratches(s, cx, cy, art, R);

  const isOne = value === 1;
  const paint = isOne ? art.pipOne : art.pip;
  const ink: Ink = { paint, rough: art.cut[0], metal: art.cut[1], glow: art.glow ? 0.35 : 0 };
  const step = PIP_STEP * TILE;
  const r = PIP_R * TILE;
  const mid = { x: cx + TILE / 2, y: cy + TILE / 2 };

  // The emblem stands in for a pip: the lone one on a 1, the middle one on
  // a 3 or a 5. Nowhere else — the count has to stay countable.
  const emblemCell = art.emblem && (isOne || value === 3 || value === 5) ? 5 : 0;

  for (const cell of PIPS[value]) {
    if (cell === emblemCell) continue;
    const row = Math.floor((cell - 1) / 3);
    const col = (cell - 1) % 3;
    const x = mid.x + (col - 1) * step;
    const y = mid.y - (1 - row) * step;
    if (art.halo) {
      cut(s, [{ path: circle(x, y, r * 1.42), depth: 0.4, stroke: r * 0.16 }],
        { paint: art.halo, rough: 0.5, metal: 0.85, glow: 0 }, art);
    }
    cut(s, pipMarks(art.style, x, y, r, R), ink, art);
  }

  if (art.emblem && emblemCell) {
    // big when it is the whole story of the face, pip-sized when it is not
    const scale = isOne ? 2 : 1.3;
    cut(s, emblemMarks(art.emblem, mid.x, mid.y, r * scale, R),
      { ...ink, glow: art.glow ? 1.6 : 0 }, art);
  } else if (!art.emblem && isOne) {
    // the plain die keeps the tradition of an outsized red 1
    cut(s, pipMarks(art.style, mid.x, mid.y, r * 1.5, R), ink, art);
  }

  for (const c of [s.col, s.hgt, s.srf, s.emi]) c?.restore();
}

/* ------------------------- height into light ------------------------- */

function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[y * w + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      sum -= src[y * w + Math.min(w - 1, Math.max(0, x - r))];
      sum += src[y * w + Math.min(w - 1, Math.max(0, x + r + 1))];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n;
      sum -= tmp[Math.min(h - 1, Math.max(0, y - r)) * w + x];
      sum += tmp[Math.min(h - 1, Math.max(0, y + r + 1)) * w + x];
    }
  }
  return out;
}

/** Slope of the height field, encoded the way three.js wants a normal map. */
function normalCanvas(h: Float32Array): HTMLCanvasElement {
  const c = surface(ATLAS_W, ATLAS_H);
  const img = c.createImageData(ATLAS_W, ATLAS_H);
  const p = img.data;
  // one texel is 1/TILE of a face, and the field spans DEPTH of world height
  const k = DEPTH * TILE * 0.5;
  for (let y = 0; y < ATLAS_H; y++) {
    const yUp = Math.max(0, y - 1) * ATLAS_W;
    const yDn = Math.min(ATLAS_H - 1, y + 1) * ATLAS_W;
    const row = y * ATLAS_W;
    for (let x = 0; x < ATLAS_W; x++) {
      const xl = Math.max(0, x - 1), xr = Math.min(ATLAS_W - 1, x + 1);
      const du = (h[row + xr] - h[row + xl]) * k;
      const dv = (h[yUp + x] - h[yDn + x]) * k;   // v runs up, y runs down
      const inv = 1 / Math.hypot(du, dv, 1);
      const i = (row + x) * 4;
      p[i] = (-du * inv * 0.5 + 0.5) * 255;
      p[i + 1] = (-dv * inv * 0.5 + 0.5) * 255;
      p[i + 2] = (inv * 0.5 + 0.5) * 255;
      p[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return c.canvas;
}

export interface DieAtlas {
  colour: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  /** R ambient occlusion, G roughness, B metalness — one texture, three jobs. */
  surface: HTMLCanvasElement;
  emissive: HTMLCanvasElement | null;
}

/** Draw one die's six faces. Deterministic: the same die always wears the same. */
export function buildAtlas(die: Die): DieAtlas {
  const art = ART[die.id] ?? BONE;
  const R = rng(hash(die.id));

  const col = surface(ATLAS_W, ATLAS_H);
  const hgt = surface(ATLAS_W, ATLAS_H, true);
  const srf = surface(ATLAS_W, ATLAS_H, true);
  const emi = art.glow ? surface(ATLAS_W, ATLAS_H) : null;

  col.fillStyle = art.base;
  col.fillRect(0, 0, ATLAS_W, ATLAS_H);
  hgt.fillStyle = '#fff';
  hgt.fillRect(0, 0, ATLAS_W, ATLAS_H);
  srf.fillStyle = `rgb(255,${Math.round(art.rough[0] * 255)},${Math.round(art.metal * 255)})`;
  srf.fillRect(0, 0, ATLAS_W, ATLAS_H);
  if (emi) { emi.fillStyle = '#000'; emi.fillRect(0, 0, ATLAS_W, ATLAS_H); }

  // Cuts only ever go deeper, never fill back in.
  hgt.globalCompositeOperation = 'multiply';

  const sheet: Sheet = { col, hgt, srf, emi };
  for (let slot = 0; slot < 6; slot++) drawFace(sheet, die, art, slot, R);

  const raw = hgt.getImageData(0, 0, ATLAS_W, ATLAS_H).data;
  const field = new Float32Array(ATLAS_W * ATLAS_H);
  for (let i = 0; i < field.length; i++) field[i] = raw[i * 4] / 255;

  const walls = blur(field, ATLAS_W, ATLAS_H, px(SOFTEN));
  const normal = normalCanvas(walls);

  // Light does not reach the bottom of a hole. Bake that once, into the
  // colour for direct light and into the R channel for the environment.
  const shade = blur(walls, ATLAS_W, ATLAS_H, px(AO_BLUR));
  const shadeCv = surface(ATLAS_W, ATLAS_H);
  const shadeImg = shadeCv.createImageData(ATLAS_W, ATLAS_H);
  const srfImg = srf.getImageData(0, 0, ATLAS_W, ATLAS_H);
  for (let i = 0; i < shade.length; i++) {
    const occ = 1 - shade[i];
    const v = Math.round(255 * (1 - AO_ON_COLOUR * occ));
    shadeImg.data[i * 4] = v;
    shadeImg.data[i * 4 + 1] = v;
    shadeImg.data[i * 4 + 2] = v;
    shadeImg.data[i * 4 + 3] = 255;
    srfImg.data[i * 4] = Math.round(255 * (1 - AO_ON_ENV * occ));
  }
  shadeCv.putImageData(shadeImg, 0, 0);
  srf.putImageData(srfImg, 0, 0);

  col.globalCompositeOperation = 'multiply';
  col.drawImage(shadeCv.canvas, 0, 0);
  col.globalCompositeOperation = 'source-over';

  return { colour: col.canvas, normal, surface: srf.canvas, emissive: emi?.canvas ?? null };
}
