import { Box3, type Group, type Mesh, type Vector3 } from 'three';
import type { Mover } from './explode.ts';

export interface AssemblyPart {
  mesh: Mesh;
  home: Vector3;
  offset: Vector3;
}

export interface Assembly {
  root: Group;
  parts: AssemblyPart[];
  bounds: Box3;
  setExplosion(amount: number): void;
  dispose(): void;
}

/**
 * An assembly whose parts slide from `home` along `offset` as separation goes from 0 to 1.
 * Bounds cover every separation, so a camera framed on them never clips a part.
 * A planned explosion passes its `movers` (which may be whole sub-assemblies) and trail lines instead.
 */
export function createAssembly(root: Group, parts: AssemblyPart[], dispose: () => void,
  planned?: { movers: Mover[]; trails?: { update(t: number): void; dispose(): void } }): Assembly {
  const movers = planned?.movers ?? parts.map(({ mesh, home, offset }) => ({ object: mesh, home, offset }));
  function setExplosion(amount: number) {
    const t = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
    for (const mover of movers) mover.object.position.copy(mover.home).addScaledVector(mover.offset, t);
    root.updateMatrixWorld(true);
    planned?.trails?.update(t);
  }
  const bounds = new Box3();
  for (const t of [0, 1]) { setExplosion(t); bounds.union(new Box3().setFromObject(root)); }
  setExplosion(0);
  return { root, parts, bounds, setExplosion, dispose: () => { planned?.trails?.dispose(); dispose(); } };
}
