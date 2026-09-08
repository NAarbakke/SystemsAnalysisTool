import {
  BufferGeometry, CylinderGeometry, Group, LatheGeometry, Mesh,
  MeshStandardMaterial, Vector2, Vector3, Box3,
} from 'three';

import type { AssemblyPart } from '../../src/assembly.ts';

/** Geometry and disassembly directions are authored directly in Three.js. */
export function createSpindle() {
  const root = new Group();
  const parts: AssemblyPart[] = [];
  const materials = {
    housing: new MeshStandardMaterial({ color: '#477e85', metalness: .45, roughness: .3 }),
    steel: new MeshStandardMaterial({ color: '#b8c5cc', metalness: .65, roughness: .25 }),
    brass: new MeshStandardMaterial({ color: '#c9a15e', metalness: .55, roughness: .3 }),
    dark: new MeshStandardMaterial({ color: '#38464f', metalness: .45, roughness: .36 }),
  };
  const ring = (outer: number, inner: number, height: number) => {
    const bevel = Math.min(.035, height / 4);
    return new LatheGeometry([
      new Vector2(inner, -height / 2 + bevel),
      new Vector2(inner + bevel, -height / 2),
      new Vector2(outer - bevel, -height / 2),
      new Vector2(outer, -height / 2 + bevel),
      new Vector2(outer, height / 2 - bevel),
      new Vector2(outer - bevel, height / 2),
      new Vector2(inner + bevel, height / 2),
      new Vector2(inner, height / 2 - bevel),
      new Vector2(inner, -height / 2 + bevel),
    ], 96);
  };
  const add = (
    name: string, geometry: BufferGeometry, material: MeshStandardMaterial,
    home: [number, number, number], offset: [number, number, number],
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.partId = name.toLowerCase().replaceAll(' ', '-');
    mesh.position.fromArray(home);
    root.add(mesh);
    parts.push({ mesh, home: new Vector3(...home), offset: new Vector3(...offset) });
  };

  add('Mounting flange', ring(1.35, .48, .28), materials.housing, [0, -1.4, 0], [0, -1.9, 0]);
  add('Bearing housing', ring(.94, .56, 1.4), materials.housing, [0, -.56, 0], [0, -.55, 0]);
  add('Lower bearing', ring(.55, .29, .24), materials.brass, [0, -1.1, 0], [0, -1.3, 0]);
  add('Upper bearing', ring(.55, .29, .24), materials.brass, [0, .03, 0], [0, .55, 0]);
  add('Spindle shaft', new CylinderGeometry(.28, .28, 3.5, 96), materials.steel, [0, .12, 0], [2.1, .25, 0]);
  add('Rotor hub', ring(.76, .29, .48), materials.dark, [0, .62, 0], [0, 1, 0]);
  add('Retaining washer', ring(.49, .29, .08), materials.steel, [0, .92, 0], [0, 1.6, 0]);
  add('Top collar', ring(.48, .29, .24), materials.housing, [0, 1.1, 0], [0, 2.05, 0]);
  add('Lock nut', ring(.42, .29, .22), materials.brass, [0, 1.34, 0], [0, 2.65, 0]);
  const screw = new CylinderGeometry(.105, .105, .42, 6);
  for (let i = 0; i < 4; i++) {
    const x = Math.cos(i * Math.PI / 2), z = Math.sin(i * Math.PI / 2);
    add(`Flange screw ${i + 1}`, screw, materials.dark, [x * 1.08, -1.3, z * 1.08], [x * .5, -1.95, z * .5]);
  }

  function setExplosion(amount: number) {
    const t = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
    for (const part of parts) part.mesh.position.copy(part.home).addScaledVector(part.offset, t);
    root.updateMatrixWorld(true);
  }

  const bounds = new Box3();
  for (const t of [0, 1]) {
    setExplosion(t);
    bounds.union(new Box3().setFromObject(root));
  }
  setExplosion(0);

  return {
    root, parts, bounds, setExplosion,
    dispose() {
      // Screws and materials are shared, so release each GPU resource once.
      for (const geometry of new Set(parts.map(p => p.mesh.geometry))) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      root.clear();
    },
  };
}
