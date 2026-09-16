import { detailMesh, band, box, type Detail } from '../display-details.ts';
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
  const cylinder = (radius:number,height:number) => {
    const b=Math.min(.012,height*.12),h=height/2;
    return new LatheGeometry([[0,-h],[radius-b,-h],[radius,-h+b],[radius,h-b],[radius-b,h],[0,h]].map(([r,y])=>new Vector2(r,y)),96);
  };

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
  add('Shoulder exterior', new LatheGeometry([new Vector2(0,-.25),...Array.from({length:13},(_,i)=>{const t=i/12;return new Vector2(.37-.095*t*t*(3-2*t),-.25+.5*t);}),new Vector2(0,.25)],96), upper, 2.66, 1.65);
  add('Nose exterior', new LatheGeometry([
    new Vector2(0, 0), ...Array.from({ length: 33 }, (_, i) => {
      const t = i / 32;
      return new Vector2(.275 * (1 - t ** 1.35), 1.6 * t);
    }),
  ], 96), dark, 2.92, 2.3);

  // Flat decorative markings move with the exterior they are attached to.
  const marking = new BoxGeometry(.12, .2, .006);
  for (const [body, radius] of [[lower, .44], [middle, .405]] as const) {
    for (const y of [-.18, .18]) {
      const mark = new Mesh(marking, paint);
      mark.position.set(0, y, radius);
      body.add(mark);
    }
  }

  // Cosmetic seams and paint panels only; no internal or functional geometry.
  for(const {mesh} of parts){
    const d:Detail[]=[];
    const spec:Record<string,[number,number]>={'Lower body exterior':[.44,3.4],'Middle body exterior':[.405,1.7],'Upper body exterior':[.37,1.2]};
    const size=spec[mesh.name];
    if(size){
      const [r,h]=size;
      for(const y of [-h/2+.035,h/2-.035])d.push({geometry:band(r+.002,.006,y),color:'#343c34'});
      for(let i=0;i<4;i++)d.push({geometry:box(.006,h-.12,.003,0,0,r+.002).rotateY(i*Math.PI/2),color:'#394233'});
      // Conforming painted access panels, with recessed-looking edge strips.
      for(const y of [-h*.24,h*.24])for(const a of [0,Math.PI]){
        d.push({geometry:new CylinderGeometry(r+.002,r+.002,.17,12,1,true,a-.14,.28).translate(0,y,0),color:'#626a55'});
        for(const edge of [-.085,.085])d.push({geometry:new CylinderGeometry(r+.003,r+.003,.004,12,1,true,a-.14,.28).translate(0,y+edge,0),color:'#30382d'});
      }
      for(const y of [-h*.36,h*.36])d.push({geometry:band(r+.001,.0035,y),color:'#5b634f'});
      if(mesh.name==='Lower body exterior'){
        d.push({geometry:box(.036,h*.82,.018,0,0,-r-.005),color:'#454c3d'});
        for(const y of [-h*.34,0,h*.34])d.push({geometry:box(.055,.032,.024,0,y,-r-.007),color:'#70765f'});
      }
    }
    if(mesh.name==='Base exterior cover')d.push({geometry:band(.418,.006,-.051),color:'#667064'});
    if(mesh.name==='Shoulder exterior')d.push({geometry:band(.369,.004,-.23),color:'#4a5143'});
    if(mesh.name==='Nose exterior')d.push({geometry:band(.275,.004,.012),color:'#646b68'});
    if(mesh.name.includes('joining band'))for(const y of [-.055,.055])d.push({geometry:band(mesh.name.startsWith('Lower')?.451:.415,.006,y),color:'#bcc0af'});
    detailMesh(mesh,d);
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
      const finishes=new Set([olive,upper,dark,trim,paint]);
      root.traverse(object=>{if(object instanceof Mesh)for(const material of [object.material].flat())finishes.add(material as MeshStandardMaterial);});
      finishes.forEach(material=>material.dispose());
      root.clear();
    },
  };
}
