import {
  Box3, BoxGeometry, BufferGeometry, CylinderGeometry, Group,
  LatheGeometry, Mesh, MeshStandardMaterial, Vector2, Vector3,
} from 'three';
import type { AssemblyPart } from '../../src/assembly.ts';

/** Decorative SS-27 / Topol-M exterior. Arbitrary scene units and artistic
 * section breaks; no internal components or functional engineering geometry. */
export function createSS27() {
  const root = new Group();
  root.name = 'SS-27 exterior study';
  root.userData = { visualOnly: true, units: 'arbitrary' };
  const parts: AssemblyPart[] = [];
  const olive = new MeshStandardMaterial({ color: '#4a5040', metalness: .3, roughness: .4 });
  const upper = new MeshStandardMaterial({ color: '#636957', metalness: .3, roughness: .38 });
  const dark = new MeshStandardMaterial({ color: '#292f32', metalness: .35, roughness: .34 });
  const trim = new MeshStandardMaterial({ color: '#929785', metalness: .55, roughness: .32 });
  const paint = new MeshStandardMaterial({ color: '#dfdfc9', roughness: .75 });
  const cylinder = (radius: number, height: number) => new CylinderGeometry(radius, radius, height, 128);

  function add(name: string, geometry: BufferGeometry, material: MeshStandardMaterial, y: number, dy: number) {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.partId = name.toLowerCase().replaceAll(' ', '-');
    mesh.position.y = y;
    root.add(mesh);
    parts.push({ mesh, home: new Vector3(0, y, 0), offset: new Vector3(0, dy, 0) });
    return mesh;
  }

  add('Base exterior cover', cylinder(.445, .1), dark, -4.26, -2);
  const lower = add('Lower body exterior', cylinder(.44, 3.4), olive, -2.5, -1.15);
  add('Lower joining band', cylinder(.45, .14), trim, -.72, -.55);
  const middle = add('Middle body exterior', cylinder(.405, 1.7), upper, .2, 0);
  add('Upper joining band', cylinder(.414, .14), trim, 1.12, .55);
  add('Upper body exterior', cylinder(.37, 1.2), olive, 1.8, 1.1);
  add('Shoulder exterior', new CylinderGeometry(.27, .37, .5, 128), upper, 2.66, 1.65);
  add('Nose exterior', new LatheGeometry([
    new Vector2(0, 0), ...Array.from({ length: 49 }, (_, i) => {
      const t = i / 48;
      return new Vector2(.275 * (1 - t ** 1.35), 1.6 * t);
    }),
  ], 128), dark, 2.92, 2.3);

  // Flat decorative markings move with the exterior they are attached to.
  const marking = new BoxGeometry(.12, .2, .006);
  for (const [body, radius] of [[lower, .44], [middle, .405]] as const) {
    for (const y of [-.18, .18]) {
      const mark = new Mesh(marking, paint);
      mark.position.set(0, y, radius);
      body.add(mark);
    }
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
      const geometries = new Set<BufferGeometry>();
      root.traverse(object => { if (object instanceof Mesh) geometries.add(object.geometry); });
      for (const geometry of geometries) geometry.dispose();
      for (const material of [olive, upper, dark, trim, paint]) material.dispose();
      root.clear();
    },
  };
}
