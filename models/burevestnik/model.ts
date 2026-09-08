import {
  Box3, BufferGeometry, Float32BufferAttribute, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Shape, ExtrudeGeometry, Vector2, Vector3,
} from 'three';
import type { AssemblyPart } from '../../src/assembly.ts';

/** Illustrative exterior only, in arbitrary scene units. The splits and movements
 * are presentation choices, not a representation of a real assembly or mechanism. */
export function createRocket() {
  const root = new Group();
  root.name = 'Burevestnik exterior study';
  root.userData = { visualOnly: true, units: 'arbitrary', source: 'PDF exterior illustrations, figures 2–3' };
  const parts: AssemblyPart[] = [];
  const materials = {
    red: new MeshStandardMaterial({ color: '#8e2524', metalness: .25, roughness: .4 }),
    nose: new MeshStandardMaterial({ color: '#aa3028', metalness: .2, roughness: .38 }),
    fin: new MeshStandardMaterial({ color: '#a3312c', metalness: .25, roughness: .35 }),
    pale: new MeshStandardMaterial({ color: '#c2c8c5', metalness: .55, roughness: .3 }),
    dark: new MeshStandardMaterial({ color: '#373d3d', metalness: .4, roughness: .42 }),
  };

  // A rounded rectangular graphic silhouette, sampled as rings along the X axis.
  function shell(stations: [number, number, number][]) {
    const positions: number[] = [], indices: number[] = [];
    const segments = 128;
    for (const [x, width, height] of stations) {
      for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        positions.push(x, Math.sign(c) * Math.sqrt(Math.abs(c)) * height,
          Math.sign(s) * Math.sqrt(Math.abs(s)) * width);
      }
    }
    for (let j = 0; j < stations.length - 1; j++) {
      for (let i = 0; i < segments; i++) {
        const a = j * segments + i, b = j * segments + (i + 1) % segments;
        indices.push(a, b, a + segments, b, b + segments, a + segments);
      }
    }
    const firstCenter = positions.length / 3;
    positions.push(stations[0][0], 0, 0);
    const lastCenter = positions.length / 3;
    positions.push(stations.at(-1)![0], 0, 0);
    const lastRing = (stations.length - 1) * segments;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(firstCenter, next, i, lastCenter, lastRing + i, lastRing + next);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function plate(points: [number, number][], thickness: number) {
    const shape = new Shape(points.map(([x, z]) => new Vector2(x, z)));
    const geometry = new ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true, bevelSize: .015,
      bevelThickness: .012, bevelSegments: 3, steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, thickness / 2, 0);
    return geometry;
  }

  function add(name: string, geometry: BufferGeometry, material: MeshStandardMaterial,
    home: [number, number, number], offset: [number, number, number]) {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.partId = name.toLowerCase().replaceAll(' ', '-');
    mesh.position.fromArray(home);
    root.add(mesh);
    parts.push({ mesh, home: new Vector3(...home), offset: new Vector3(...offset) });
    return mesh;
  }

  add('Nose exterior', shell([
    [-1.05, .025, .02], [-.85, .19, .14], [-.5, .34, .26], [0, .4, .32],
  ]), materials.nose, [-3, 0, 0], [-1.15, .1, 0]);
  add('Main body exterior', shell([[-2, .4, .32], [2, .4, .32]]), materials.red,
    [-.98, 0, 0], [0, 0, 0]);
  add('Rear body exterior', shell([[-1.15, .4, .32], [1.15, .26, .22]]), materials.red,
    [2.19, 0, 0], [1.1, 0, 0]);

  const wing = plate([[-.45, .27], [.32, 2.25], [.8, 2.25], [.35, .27]], .055);
  add('Left wing', wing, materials.fin, [.15, .29, 0], [0, .55, 1.1]);
  const rightWing = wing.clone().rotateX(Math.PI);
  add('Right wing', rightWing, materials.fin, [.15, .29, 0], [0, .55, -1.1]);

  const pod = new LatheGeometry([
    new Vector2(0, -1.9), new Vector2(.12, -1.75), new Vector2(.19, -1.5),
    new Vector2(.19, 1.5), new Vector2(.16, 1.6), new Vector2(0, 1.6),
  ], 128).rotateZ(-Math.PI / 2);
  add('Left side pod exterior', pod, materials.pale, [-.45, -.22, .52], [0, -.55, 1.15]);
  add('Right side pod exterior', pod, materials.pale, [-.45, -.22, -.52], [0, -.55, -1.15]);

  const tailFin = plate([[-.4, .18], [.08, 1], [.46, 1], [.32, .18]], .045);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    add(`Tail fin ${i + 1}`, tailFin.clone().rotateX(angle), materials.fin,
      [2.85, 0, 0], [1.3, -Math.sin(angle) * .65, Math.cos(angle) * .65]);
  }
  tailFin.dispose();
  add('Tail end cover', shell([[-.025, .245, .205], [.025, .245, .205]]),
    materials.dark, [3.36, 0, 0], [1.8, 0, 0]);

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
      for (const geometry of new Set(parts.map(p => p.mesh.geometry))) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      root.clear();
    },
  };
}
