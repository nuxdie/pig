import { Color, MeshPhysicalMaterial } from 'three';
import type { DieId } from '../lib/types';

/* Each die keeps the character it had in CSS — bone, chalk, ivory, brass,
   pauper, saint, devil — but as real surfaces now: brass is actual metal,
   saint has a clearcoat, chalk is bone dry. plain, whet and crown share the
   default body, exactly as they did before. */

interface Look {
  body: ConstructorParameters<typeof MeshPhysicalMaterial>[0];
  pip: string;
  /** The 1-pip, when this die carries one. */
  pipOne: string;
}

const BONE: Look = {
  body: { color: '#e9dfc2', roughness: 0.34, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.32 },
  pip: '#1f241c',
  pipOne: '#a8362b'
};

const LOOKS: Record<DieId, Look> = {
  plain: BONE,
  whet: BONE,
  crown: BONE,
  chalk: {
    body: { color: '#eceee6', roughness: 0.92, metalness: 0.0, clearcoat: 0.0 },
    pip: '#4e5449',
    pipOne: '#4e5449'
  },
  ivory: {
    body: { color: '#f1e2be', roughness: 0.3, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: '#fff6dd' },
    pip: '#57401f',
    pipOne: '#57401f'
  },
  brass: {
    body: { color: '#c8a95c', roughness: 0.29, metalness: 0.92 },
    pip: '#362810',
    pipOne: '#7d2418'
  },
  pauper: {
    body: { color: '#c3bda8', roughness: 0.84, metalness: 0.05 },
    pip: '#33362b',
    pipOne: '#33362b'
  },
  saint: {
    body: { color: '#e7ebe2', roughness: 0.16, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.1 },
    pip: '#2e6b4c',
    pipOne: '#2e6b4c'
  },
  devil: {
    body: { color: '#57201a', roughness: 0.33, metalness: 0.1, clearcoat: 0.45, clearcoatRoughness: 0.2 },
    pip: '#e0c4bd',
    pipOne: '#170604'
  }
};

export interface DieMaterials {
  body: MeshPhysicalMaterial;
  pip: MeshPhysicalMaterial;
  pipOne: MeshPhysicalMaterial;
}

const cache = new Map<DieId, DieMaterials>();

function pipMaterial(hex: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(hex),
    roughness: 0.44,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25
  });
}

/** Materials are shared between dice of the same kind and live for the session. */
export function materialsFor(id: DieId): DieMaterials {
  const hit = cache.get(id);
  if (hit) return hit;
  const look = LOOKS[id] ?? BONE;
  const made: DieMaterials = {
    body: new MeshPhysicalMaterial({ ...look.body }),
    pip: pipMaterial(look.pip),
    pipOne: pipMaterial(look.pipOne)
  };
  cache.set(id, made);
  return made;
}

export function disposeMaterials(): void {
  cache.forEach((m) => { m.body.dispose(); m.pip.dispose(); m.pipOne.dispose(); });
  cache.clear();
}
