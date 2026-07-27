import {
  CanvasTexture, Color, LinearSRGBColorSpace, MeshPhysicalMaterial, SRGBColorSpace, Vector2
} from 'three';
import type { Die, DieId } from '../lib/types';
import { buildAtlas } from './faceArt';

/* Each die keeps the character it had in CSS — bone, chalk, ivory, brass,
   pauper, saint, devil — but as a real surface: brass is actual metal, saint
   is polished and gilded, chalk is bone dry, the whetstone die is stone.

   The shape of every pip and every scratch comes from `faceArt`, which draws
   the die's six faces into one atlas: colour, a normal map for the engraving,
   and one more texture doing three jobs at once — R is ambient occlusion in
   the bottom of the cuts, G is roughness, B is metalness. That last channel
   is how brass can be metal everywhere except inside its pips, and how the
   crown die can be bone with gold in the grooves.

   `roughness` and `metalness` here are the *maximum*: the map only scales
   them down. */

interface Look {
  params: ConstructorParameters<typeof MeshPhysicalMaterial>[0];
  /** How hard the engraving bites. */
  relief?: number;
  /** Embers, for the one die that has them. */
  emissive?: number;
}

const BONE: Look = {
  params: { roughness: 0.54, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.4 }
};

const LOOKS: Record<DieId, Look> = {
  plain: BONE,
  whet: {
    params: { roughness: 0.74, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.6 },
    relief: 1.15
  },
  brass: {
    params: { roughness: 0.44, metalness: 0.92 },
    relief: 1.1
  },
  pauper: {
    params: { roughness: 0.9, metalness: 0.05 },
    relief: 1.2
  },
  devil: {
    params: { roughness: 0.52, metalness: 0.1, clearcoat: 0.42, clearcoatRoughness: 0.24 },
    emissive: 1.35
  },
  chalk: {
    params: { roughness: 0.96, metalness: 0 },
    relief: 0.6
  },
  ivory: {
    params: {
      roughness: 0.46, metalness: 0, clearcoat: 0.36, clearcoatRoughness: 0.26,
      sheen: 0.4, sheenColor: new Color('#fff6dd')
    }
  },
  saint: {
    params: { roughness: 0.3, metalness: 0.8, clearcoat: 0.66, clearcoatRoughness: 0.1 },
    relief: 0.9
  },
  crown: {
    params: { roughness: 0.48, metalness: 0.9, clearcoat: 0.3, clearcoatRoughness: 0.24 }
  }
};

export interface DieMaterial {
  body: MeshPhysicalMaterial;
}

const cache = new Map<DieId, DieMaterial>();
/** The dice whose emissive breathes. */
const embers: { m: MeshPhysicalMaterial; base: number }[] = [];

function texture(canvas: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Materials are shared between dice of the same kind and live for the session:
 * the tray and the dice cards both draw from here, and the atlas behind one is
 * the most expensive thing in `dice/` to build.
 */
export function materialFor(die: Die): DieMaterial {
  const hit = cache.get(die.id);
  if (hit) return hit;

  const look = LOOKS[die.id] ?? BONE;
  const atlas = buildAtlas(die);

  const map = texture(atlas.colour, true);
  const normalMap = texture(atlas.normal, false);
  const surfaceMap = texture(atlas.surface, false);
  const emissiveMap = atlas.emissive ? texture(atlas.emissive, true) : null;

  const body = new MeshPhysicalMaterial({
    ...look.params,
    map,
    normalMap,
    normalScale: new Vector2(look.relief ?? 1, look.relief ?? 1),
    // the clearcoat is a separate layer and needs telling about the pits too,
    // or the lacquer floats flat over them
    clearcoatNormalMap: look.params?.clearcoat ? normalMap : null,
    clearcoatNormalScale: new Vector2(0.6, 0.6),
    aoMap: surfaceMap,
    roughnessMap: surfaceMap,
    metalnessMap: surfaceMap,
    emissive: emissiveMap ? new Color('#ffffff') : new Color('#000000'),
    emissiveMap,
    emissiveIntensity: look.emissive ?? 0
  });

  if (emissiveMap && look.emissive) embers.push({ m: body, base: look.emissive });

  const made: DieMaterial = { body };
  cache.set(die.id, made);
  return made;
}

/** The devil's die is never quite out. Called from the tray's frame loop. */
export function breathe(seconds: number): void {
  for (const e of embers) {
    e.m.emissiveIntensity = e.base * (0.78 + 0.22 * Math.sin(seconds * 1.7));
  }
}
