import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3 } from 'three';
import type { Die } from '../lib/types';
import { faceUv } from './faceArt';
import { faceBasis, SLOT_NORMAL } from './faces';
import { materialFor } from './materials';

/* A die is one mesh. The pips are not geometry any more and not little balls
   on the surface either — they are cut into the face by the normal and
   occlusion maps `faceArt` draws, so they read as holes with paint in the
   bottom, the way a real die does.

   The body is a rounded box built here rather than by three's
   RoundedBoxGeometry, for two reasons: the corners want to be generously
   round, and every face needs its own square of the texture atlas laid on
   it the right way up. Six patches, one per slot, meeting exactly on the
   corners of the fillet.

   Note the collider in `solver.ts` is still a plain 0.5 cuboid. That is
   deliberate: the corner radius is cosmetic, and the throw — which is the
   game's random number generator — is left exactly as it was measured. */

export const DIE_SIZE = 1;
const HALF = DIE_SIZE / 2;
/** Corner radius. Casino dice sit around here; much more and it reads as a toy. */
const CORNER = 0.13;
/** Faces bow out by a hair, the way a die that has been rolled a lot does. */
const BULGE = 0.006;

const SEG_FLAT = 8;
const SEG_ROUND = 5;

let bodyGeo: BufferGeometry | null = null;

/** Where to sample along one axis of a cube face: sparse flat, dense round. */
function axisSamples(): number[] {
  const flat = HALF - CORNER;
  const t: number[] = [];
  for (let k = SEG_ROUND; k >= 1; k--) {
    t.push(-(flat + CORNER * Math.tan(((k / SEG_ROUND) * Math.PI) / 4)));
  }
  for (let k = 0; k <= SEG_FLAT; k++) t.push(-flat + (2 * flat * k) / SEG_FLAT);
  for (let k = 1; k <= SEG_ROUND; k++) {
    t.push(flat + CORNER * Math.tan(((k / SEG_ROUND) * Math.PI) / 4));
  }
  return t;
}

/**
 * The rounded box. Take a point on the cube's surface, clamp it into the
 * inner box, and push it back out by the corner radius: flat in the middle,
 * cylindrical along the edges, spherical at the corners, all in one line.
 */
function buildBody(): BufferGeometry {
  const t = axisSamples();
  const n = t.length;
  const lim = HALF - CORNER;
  const clamp = (v: number) => Math.min(lim, Math.max(-lim, v));

  const verts = new Float32Array(6 * n * n * 3);
  const norms = new Float32Array(6 * n * n * 3);
  const uvs = new Float32Array(6 * n * n * 2);
  const index: number[] = [];

  const p = new Vector3();
  const q = new Vector3();
  const d = new Vector3();
  let v = 0;

  for (let slot = 0; slot < 6; slot++) {
    const normal = SLOT_NORMAL[slot];
    const { u, v: up } = faceBasis(slot);
    const base = v;

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++, v++) {
        p.copy(normal).multiplyScalar(HALF).addScaledVector(u, t[i]).addScaledVector(up, t[j]);
        q.set(clamp(p.x), clamp(p.y), clamp(p.z));
        d.subVectors(p, q).normalize();

        const flatness = Math.max(0, d.dot(normal)) ** 6;
        const r = CORNER + BULGE * flatness;
        verts[v * 3] = q.x + d.x * r;
        verts[v * 3 + 1] = q.y + d.y * r;
        verts[v * 3 + 2] = q.z + d.z * r;
        norms[v * 3] = d.x; norms[v * 3 + 1] = d.y; norms[v * 3 + 2] = d.z;

        const [tu, tv] = faceUv(slot, t[i] / DIE_SIZE, t[j] / DIE_SIZE);
        uvs[v * 2] = tu; uvs[v * 2 + 1] = tv;
      }
    }

    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = base + j * n + i;
        index.push(a, a + 1, a + n, a + 1, a + n + 1, a + n);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(verts, 3));
  geo.setAttribute('normal', new BufferAttribute(norms, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/** One die, ready to be dropped into the scene. */
export function buildDie(die: Die): Group {
  if (!bodyGeo) bodyGeo = buildBody();

  const group = new Group();
  const body = new Mesh(bodyGeo, materialFor(die).body);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  return group;
}
