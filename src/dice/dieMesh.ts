import { Group, InstancedMesh, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PIPS } from '../lib/dice';
import type { Die } from '../lib/types';
import { faceBasis, SLOT_NORMAL } from './faces';
import { materialsFor } from './materials';

/* A die is a rounded cube with real pips sunk into it — spherical caps just
   proud of the surface, so they catch the light and cast their own tiny
   shadows instead of being painted on. */

export const DIE_SIZE = 1;
const HALF = DIE_SIZE / 2;
const CORNER = 0.085;
const PIP_R = 0.083;
/** How deep the pip sphere sits, leaving a shallow cap showing. */
const PIP_SINK = 0.055;
/** Spacing of the 3×3 pip grid, in face-local units. */
const PIP_STEP = 0.255;

let bodyGeo: RoundedBoxGeometry | null = null;
let pipGeo: SphereGeometry | null = null;

function geometries() {
  if (!bodyGeo) bodyGeo = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, CORNER);
  if (!pipGeo) pipGeo = new SphereGeometry(PIP_R, 18, 12);
  return { bodyGeo, pipGeo };
}

/** Where every pip sits on a die, split by whether it belongs to a 1-face. */
function pipPlacements(die: Die): { normal: Matrix4[]; one: Matrix4[] } {
  const normal: Matrix4[] = [];
  const one: Matrix4[] = [];
  const pos = new Vector3();
  const q = new Quaternion();
  const scale = new Vector3(1, 1, 1);

  for (let slot = 0; slot < 6; slot++) {
    const value = die.faces[slot];
    const cells = PIPS[value];
    const n = SLOT_NORMAL[slot];
    const { u, v } = faceBasis(slot);
    const target = value === 1 ? one : normal;

    for (const cell of cells) {
      const row = Math.floor((cell - 1) / 3);
      const col = (cell - 1) % 3;
      pos.copy(n).multiplyScalar(HALF - PIP_SINK)
        .addScaledVector(u, (col - 1) * PIP_STEP)
        .addScaledVector(v, (1 - row) * PIP_STEP);
      target.push(new Matrix4().compose(pos.clone(), q, scale));
    }
  }
  return { normal, one };
}

/** One die, ready to be dropped into the scene. */
export function buildDie(die: Die): Group {
  const { bodyGeo, pipGeo } = geometries();
  const mats = materialsFor(die.id);
  const group = new Group();

  const body = new Mesh(bodyGeo, mats.body);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const { normal, one } = pipPlacements(die);
  for (const [list, material] of [[normal, mats.pip], [one, mats.pipOne]] as const) {
    if (!list.length) continue;
    const inst = new InstancedMesh(pipGeo, material, list.length);
    list.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    group.add(inst);
  }

  return group;
}

export function disposeDieGeometry(): void {
  bodyGeo?.dispose(); bodyGeo = null;
  pipGeo?.dispose(); pipGeo = null;
}
