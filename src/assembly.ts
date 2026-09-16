import type { Box3, Group, Mesh, Vector3 } from 'three';

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
