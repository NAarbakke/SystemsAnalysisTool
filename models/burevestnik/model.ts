import { detailMesh, band, box, disposeParts, type Detail } from '../display-details.ts';
import {
  Box3, BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, LatheGeometry, TubeGeometry,
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
    red: new MeshStandardMaterial({ color: '#8e2524', metalness: .12, roughness: .48 }),
    nose: new MeshStandardMaterial({ color: '#aa3028', metalness: .1, roughness: .43 }),
    fin: new MeshStandardMaterial({ color: '#a3312c', metalness: .12, roughness: .45 }),
    pale: new MeshStandardMaterial({ color: '#c2c8c5', metalness: .55, roughness: .3 }),
    dark: new MeshStandardMaterial({ color: '#373d3d', metalness: .4, roughness: .42 }),
  };

  // A rounded rectangular graphic silhouette, sampled as rings along the X axis.
  function shell(stations: [number, number, number][]) {
    const positions: number[] = [], indices: number[] = [];
    const segments = 64;
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
    // Duplicate rim vertices so flat section caps do not distort side normals.
    for(const end of [0,stations.length-1]){
      const center=positions.length/3;
      positions.push(stations[end][0],0,0);
      const rim=positions.length/3;
      for(let i=0;i<segments;i++)positions.push(...positions.slice((end*segments+i)*3,(end*segments+i)*3+3));
      for(let i=0;i<segments;i++){
        const next=(i+1)%segments;
        if(end===0)indices.push(center,rim+next,rim+i);
        else indices.push(center,rim+i,rim+next);
      }
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

  add('Nose exterior', shell(Array.from({length:25},(_,i):[number,number,number]=>{
    const t=i/24,round=Math.sin(t*Math.PI/2);
    return [-1.05+1.05*t,.008+.392*round,.006+.314*round];
  })), materials.nose, [-3, 0, 0], [-1.15, .1, 0]);
  add('Main body exterior', shell([[-2, .4, .32], [2, .4, .32]]), materials.red,
    [-.98, 0, 0], [0, 0, 0]);
  add('Rear body exterior', shell(Array.from({length:17},(_,i):[number,number,number]=>{
    const t=i/16,ease=t*t*(3-2*t);
    return [-1.15+2.3*t,.4-.14*ease,.32-.1*ease];
  })), materials.red,
    [2.19, 0, 0], [1.1, 0, 0]);

  const wing = plate([[-.45, .27], [.32, 2.25], [.8, 2.25], [.35, .27]], .055);
  add('Left wing', wing, materials.fin, [.15, .29, 0], [0, .55, 1.1]);
  const rightWing = wing.clone().rotateX(Math.PI);
  add('Right wing', rightWing, materials.fin, [.15, .29, 0], [0, .55, -1.1]);

  const pod = new LatheGeometry([
    ...Array.from({length:13},(_,i)=>{const t=i/12;return new Vector2(.19*Math.sin(t*Math.PI/2),-1.9+.4*t);}),
    new Vector2(.19,1.42),new Vector2(.186,1.48),new Vector2(.174,1.54),new Vector2(.15,1.58),new Vector2(.12,1.6),new Vector2(0,1.6),
  ], 64).rotateZ(-Math.PI / 2);
  add('Left side pod exterior', pod, materials.pale, [-.45, -.22, .52], [0, -.55, 1.15]);
  add('Right side pod exterior', pod.clone(), materials.pale, [-.45, -.22, -.52], [0, -.55, -1.15]);

  const tailFin = plate([[-.4, .18], [.08, 1], [.46, 1], [.32, .18]], .045);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    add(`Tail fin ${i + 1}`, tailFin.clone().rotateX(angle), materials.fin,
      [2.85, 0, 0], [1.3, -Math.sin(angle) * .65, Math.cos(angle) * .65]);
  }
  tailFin.dispose();
  add('Tail end cover', shell([[-.025, .245, .205], [.025, .245, .205]]),
    materials.dark, [3.36, 0, 0], [1.8, 0, 0]);

  // Curved seams follow the rounded rectangular display skin.
  function contour(x:number,w:number,h:number){
    const points=Array.from({length:48},(_,i)=>{
      const a=i*Math.PI/24,c=Math.cos(a),s=Math.sin(a);
      return new Vector3(x,Math.sign(c)*Math.sqrt(Math.abs(c))*(h+.002),Math.sign(s)*Math.sqrt(Math.abs(s))*(w+.002));
    });
    return new TubeGeometry(new CatmullRomCurve3(points,true),64,.0035,4,true);
  }
  // Artistic exterior panel lines in arbitrary units.
  for(const {mesh} of parts){
    const d:Detail[]=[];
    if(mesh.name==='Main body exterior'){
      for(const x of [-1.6,-.7,.65,1.65]){
        d.push({geometry:contour(x,.4,.32),color:'#5e2525'});
      }
      for(const z of [-.403,.403]){
        d.push({geometry:box(.34,.14,.005,-.45,.02,z),color:'#b84034'});
        for(const x of [-.59,-.31])for(const y of [-.035,.075])d.push({geometry:box(.014,.014,.008,x,y,z),color:'#d79179'});
      }
    }
    if(mesh.name==='Nose exterior')d.push({geometry:contour(-.055,.398,.319),color:'#742a25'});
    if(mesh.name==='Rear body exterior')for(const x of [-.88,.25,.96]){
      const t=(x+1.15)/2.3,e=t*t*(3-2*t);
      d.push({geometry:contour(x,.4-.14*e,.32-.1*e),color:'#642221'});
    }
    if(mesh.name.includes('side pod'))for(const x of [-1.4,-.7,.4,1.35])d.push({geometry:band(.191,.005).rotateZ(-Math.PI/2).translate(x,0,0),color:'#758280'});
    if(mesh.name==='Left wing'||mesh.name==='Right wing'){
      const sign=mesh.name==='Left wing'?1:-1;
      const stripe=plate([[.14,.84],[.65,2.14],[.70,2.14],[.19,.84]],.002);
      stripe.translate(0,.0295,0);if(sign<0)stripe.rotateX(Math.PI);
      d.push({geometry:stripe,color:'#792723'});
      const tip=plate([[.307,2.20],[.331,2.25],[.79,2.25],[.778,2.20]],.002);
      tip.translate(0,.0295,0);if(sign<0)tip.rotateX(Math.PI);
      d.push({geometry:tip,color:'#bcb7a8'});
    }
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
      disposeParts(parts);
      root.clear();
    },
  };
}
