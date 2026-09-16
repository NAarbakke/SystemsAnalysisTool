import { machinedRing, detailMesh, box, band, bolt, bearingDetails, disposeParts, type Detail } from '../display-details.ts';
import {
  BufferGeometry, CylinderGeometry, Group, LatheGeometry, Mesh,
  MeshStandardMaterial, Vector2, Vector3, Box3,
} from 'three';

import type { AssemblyPart } from '../../src/assembly.ts';
import { componentDescriptions } from './components.ts';

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
  Object.entries(materials).forEach(([name, material]) => { material.name = name; });
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
    ], 64);
  };
  const add = (
    name: string, geometry: BufferGeometry, material: MeshStandardMaterial,
    home: [number, number, number], offset: [number, number, number],
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.description = componentDescriptions[name] || (name.startsWith('Flange screw') ? 'One of four fasteners arranged around the mounting flange. Threads are omitted from this illustrative model.' : '');
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


  for(const {mesh} of parts){
    const d:Detail[]=[];
    if(mesh.name==='Bearing housing') {
      for(const y of [-.6,-.4,.4,.6])d.push({geometry:band(.945,.035,y),color:'#355860'});
      for(let i=0;i<8;i++){const a=i*Math.PI/4;d.push({geometry:box(.075,1.15,.12,.94,0,0).rotateY(a),color:'#568e94'});}
    }
    if(mesh.name==='Mounting flange') {d.push({geometry:band(1.22,.012,.145),color:'#9dafb4'});for(let i=0;i<4;i++)d.push({geometry:band(.12,.02).translate(Math.cos(i*Math.PI/2)*1.08,.15,Math.sin(i*Math.PI/2)*1.08),color:'#aab5b8'});}
    if(mesh.name.includes('bearing')) {mesh.geometry.dispose();mesh.geometry=ring(.55,.48,.24);d.push({geometry:ring(.36,.29,.24),color:'#b8c5cc'});d.push(...bearingDetails(.42));d.push({geometry:band(.51,.022,.125),color:'#819098'},{geometry:band(.32,.018,.125),color:'#819098'});}
    if(mesh.name.startsWith('Flange screw')){
      mesh.geometry=new CylinderGeometry(.065,.065,.42,20);
      d.push({geometry:machinedRing(.112,.043,.1,24).translate(0,.19,0),color:'#52636e'},{geometry:machinedRing(.14,.067,.035,32).translate(0,.125,0),color:'#aab8c0'});
    }
    if(mesh.name==='Spindle shaft'){
      for(const y of [-.92,.02,.58])d.push({geometry:machinedRing(.315,.275,.11,48).translate(0,y,0),color:'#a8b9c4'});d.push({geometry:box(.11,.65,.05,0,1.08,.278),color:'#788993'});for(const y of [-1.4,-1.25,.35,.48])d.push({geometry:band(.282,.012,y),color:'#52636e'});}
    if(mesh.name==='Rotor hub')for(let i=0;i<8;i++)d.push({geometry:bolt(.6,.265,i*Math.PI/4),color:'#b5bec3'});
    if(mesh.name==='Top collar'||mesh.name==='Lock nut')for(let i=0;i<6;i++)d.push({geometry:box(.045,.13,.1,.42,0,0).rotateY(i*Math.PI/3),color:'#69767a'});
    detailMesh(mesh,d);
  }

  screw.dispose();

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
      disposeParts(parts);
      root.clear();
    },
  };
}
