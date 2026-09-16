import { tube, detailMesh, box, band, disposeParts, type Detail } from '../display-details.ts';
import { Box3, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Assembly, AssemblyPart } from '../../src/assembly.ts';

/** Stylized civilian display model, in arbitrary units; no aerodynamic design or performance data. */
export function createTurbofan(): Assembly {
  const root = new Group(); root.name = 'Civilian turbofan cutaway';
  const parts: AssemblyPart[] = [];
  function shell(profile: [number,number][], arc = Math.PI * 2, segments = 96) {
    const geometry = new LatheGeometry(profile.map(([r,x])=>new Vector2(r,x)),segments,Math.PI*.2,arc);
    geometry.rotateZ(-Math.PI/2); return geometry;
  }
  function ring(outer: number, inner: number, width: number) {
    return shell([[inner,-width/2],[outer,-width/2],[outer,width/2],[inner,width/2],[inner,-width/2]],Math.PI*2,32);
  }
  function combine(geometries: BufferGeometry[]) {
    const flat = geometries.map(g=>g.index ? g.toNonIndexed() : g);
    const merged = mergeGeometries(flat);
    new Set([...geometries,...flat]).forEach(g=>g.dispose());
    if (!merged) throw new Error('Could not build display geometry.'); return merged;
  }
  // Closed, swept ribbons give the display blades curved silhouettes. These
  // arbitrary artistic profiles are not aerodynamic sections or CAD dimensions.
  function blade(radius: number, sweep: number, stator=false) {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const rows=stator?3:radius>1?10:6, columns=stator?2:radius>1?4:3, layer=(rows+1)*(columns+1);
    for (let side=0;side<2;side++) for(let i=0;i<=rows;i++) for(let j=0;j<=columns;j++) {
      const t=i/rows, u=j/columns-.5, r=radius*(.28+.7*t);
      const width=radius*(.19-.055*t);
      const angle=sweep*t*t + u*width/r;
      positions.push(radius*(.13*t*t+u*(.3-.18*t))+(side?1:-1)*radius*.008, r*Math.cos(angle),r*Math.sin(angle));
      uv.push(j/columns,t);
    }
    for(let side=0;side<2;side++) for(let i=0;i<rows;i++) for(let j=0;j<columns;j++) {
      const a=side*layer+i*(columns+1)+j,b=a+columns+1;
      if(side) indices.push(a,b,a+1,a+1,b,b+1); else indices.push(a,a+1,b,a+1,b+1,b);
    }
    const edge:number[]=[];
    for(let j=0;j<=columns;j++)edge.push(j);
    for(let i=1;i<=rows;i++)edge.push(i*(columns+1)+columns);
    for(let j=columns-1;j>=0;j--)edge.push(rows*(columns+1)+j);
    for(let i=rows-1;i>0;i--)edge.push(i*(columns+1));
    edge.forEach((a,i)=>{const b=edge[(i+1)%edge.length];indices.push(a,a+layer,b,b,a+layer,b+layer);});
    const geometry=new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }
  function wheel(radius: number, count: number, sweep=.32) {
    const geometries: BufferGeometry[] = [ring(radius*.3,radius*.12,.18)];
    for (let i=0;i<count;i++) {
      const ribbon = blade(radius,sweep); ribbon.rotateX(i/count*Math.PI*2); geometries.push(ribbon);
    }
    return combine(geometries);
  }
  function rotorStack(count: number, radius: number, spacing: number) {
    const geometries: BufferGeometry[]=[];
    for(let i=0;i<count;i++) {
      const row=wheel(radius*(1-i*.035),18,.16); row.translate((i-(count-1)/2)*spacing,0,0); geometries.push(row);
      const spacer=ring(radius*.32,radius*.12,.1);spacer.translate((i-(count-1)/2)*spacing+.08,0,0);geometries.push(spacer);
    }
    return combine(geometries);
  }
  function ribbedCasing() {
    const arc=Math.PI*1.25;
    const pieces=[shell([[.8,-1.35],[.78,.4],[.64,1.25],[.56,1.25],[.7,.4],[.72,-1.35],[.8,-1.35]],arc)];
    for(let i=0;i<9;i++) {
      const x=-1.25+i*.28,r=.8-Math.max(0,x-.3)*.14;
      const rib=shell([[r,x-.025],[r+.05,x-.025],[r+.05,x+.025],[r,x+.025],[r,x-.025]],arc,40); pieces.push(rib);
    }
    return combine(pieces);
  }
  function add(name: string, geometry: BufferGeometry, color: string, x: number, offset: [number,number,number], role: string) {
    const material = new MeshStandardMaterial({color,metalness:name==='Nacelle cutaway'?.25:.7,roughness:name==='Nacelle cutaway'?.3:.38}); material.name = `${name} display finish`;
    const mesh = new Mesh(geometry,material); mesh.name = name; mesh.position.x=x;
    mesh.userData.partId = name.toLowerCase().replaceAll(' ','-');
    mesh.userData.componentInfo = {partNumber:`TF-DEMO-${parts.length+1}`,role,source:'Illustrative geometry; material specification not supplied'};
    root.add(mesh); parts.push({mesh,home:mesh.position.clone(),offset:new Vector3(...offset)});
  }
  add('Inlet lip',shell([[1.62,-.22],[1.7,-.16],[1.74,0],[1.7,.16],[1.6,.22],[1.55,.12],[1.55,-.12],[1.62,-.22]]),'#b8c8d4',-2.15,[-1.1,0,0],'Air inlet');
  add('Fan',wheel(1.5,24,.4),'#617a8d',-1.8,[-.75,0,0],'Front fan section');
  const spinner = shell([[0,-.52],[.09,-.47],[.2,-.33],[.3,-.12],[.38,.14],[.4,.3],[0,.3],[0,-.52]]);
  add('Spinner',spinner,'#344451',-2.04,[-1.65,0,0],'Fan hub cover');
  add('Nacelle cutaway',shell([[1.7,-2],[1.73,-1.6],[1.67,.8],[1.3,2],[1.22,2],[1.57,.8],[1.63,-1.6],[1.6,-2],[1.7,-2]],Math.PI*1.25),'#d5dce0',0,[0,2.2,0],'Outer enclosure, open cutaway');
  add('Bypass outlet',ring(1.29,.92,.25),'#708992',1.9,[1.1,.7,0],'Outer flow outlet');
  add('Core casing cutaway',ribbedCasing(),'#65727d',0,[0,0,-1.8],'Core enclosure, open cutaway');
  add('Compressor section',rotorStack(5,.68,.18),'#91a3b0',-.8,[-.3,0,1.4],'Illustrative core compressor section');
  const combustorParts: BufferGeometry[]=[ring(.72,.5,.62),ring(.76,.48,.07).translate(-.34,0,0),ring(.76,.48,.07).translate(.34,0,0)];
  for(let i=0;i<16;i++) { const boss=new CylinderGeometry(.035,.035,.08,8);boss.translate(0,.74,0);boss.rotateX(i/16*Math.PI*2);combustorParts.push(boss); }
  add('Combustor section',combine(combustorParts),'#947759',.05,[0,0,1.8],'Illustrative combustion section');
  add('Turbine section',rotorStack(3,.56,.16),'#6e797f',.8,[.6,0,1.4],'Illustrative turbine section');
  add('Core exhaust',shell([[.6,-.35],[.5,.5],[.36,.7],[.3,.65],[.43,.45],[.53,-.35],[.6,-.35]]),'#88969d',1.6,[1.6,0,0],'Core outlet');

  for(const {mesh} of parts){
    const d:Detail[]=[];
    if(mesh.name==='Nacelle cutaway'){
      for(const x of [-1.55,-.65,.35,1.15]){
        const r=(x<.8?1.73-(x+1.6)*.025:1.67-(x-.8)*.37/1.2)+.003;
        d.push({geometry:shell([[r,x-.012],[r+.008,x-.012],[r+.008,x+.012],[r,x+.012]],Math.PI*1.25,64),color:'#8297a4'});
      }
      for(let i=0;i<7;i++){const a=Math.PI*.2+i*Math.PI*1.25/6;d.push({geometry:tube([[-1.6,-1.625*Math.sin(a),1.625*Math.cos(a)],[.8,-1.565*Math.sin(a),1.565*Math.cos(a)],[1.65,-1.317*Math.sin(a),1.317*Math.cos(a)]],.012,8),color:'#9bafb9'});}
    }
    if(mesh.name==='Inlet lip')d.push({geometry:band(1.66,.012).rotateZ(-Math.PI/2).translate(-.13,0,0),color:'#6c8292'});
    if(mesh.name==='Bypass outlet'){
      for(let i=0;i<10;i++)d.push({geometry:box(.18,.4,.045,0,1.09,0).rotateX(i*Math.PI/5),color:'#a5b5bd'});
    }
    if(mesh.name==='Fan'){
      d.push({geometry:band(.45,.022).rotateZ(-Math.PI/2).translate(-.08,0,0),color:'#c2cdd3'});
      for(let i=0;i<12;i++){const a=i*Math.PI/6;const g=new CylinderGeometry(.035,.035,.025,6).rotateZ(-Math.PI/2).translate(-.1,.38*Math.cos(a),.38*Math.sin(a));d.push({geometry:g,color:'#b8c5cd'});}
    }
    if(mesh.name==='Core casing cutaway')for(const x of [-1.2,.35,1.1])for(let i=0;i<7;i++){const a=Math.PI*.2+i*Math.PI*1.25/6,r=x>.4?.7:.83;d.push({geometry:box(.07,.065,.065,x,-r*Math.sin(a),r*Math.cos(a)),color:'#acbbc4'});}
    if(mesh.name==='Combustor section'){
      for(let i=0;i<16;i++)d.push({geometry:tube([[-.27,.72,0],[-.18,.82,0],[.05,.84,0],[.18,.74,0]],.016,12).rotateX(i*Math.PI/8),color:'#c7a780'});
    }
    if(mesh.name==='Compressor section'||mesh.name==='Turbine section'){
      const compressor=mesh.name==='Compressor section',count=compressor?4:2;
      for(let row=0;row<count;row++)for(let i=0;i<18;i++){
        const r=(compressor?.66:.54)*(1-row*.035),x=(row-(count-1)/2)*(compressor?.18:.16);
        d.push({geometry:blade(r,-.22,true).rotateX((i+.5)*Math.PI/9).translate(x,0,0),color:'#566d7b'});
      }
      d.push({geometry:new CylinderGeometry(.095,.095,compressor?1.1:.65,32).rotateZ(Math.PI/2),color:'#cad3d7'});
    }
    if(mesh.name==='Combustor section')for(const x of [-.23,.23])d.push({geometry:band(.73,.025).rotateZ(-Math.PI/2).translate(x,0,0),color:'#b99975'});
    if(mesh.name==='Core exhaust')for(let i=0;i<12;i++)d.push({geometry:box(.6,.025,.028,0,.515,0).rotateX(i*Math.PI/6),color:'#647781'});
    detailMesh(mesh,d);
  }

  function setExplosion(amount: number) {
    const t = Number.isFinite(amount) ? Math.min(1,Math.max(0,amount)) : 0;
    parts.forEach(p=>p.mesh.position.copy(p.home).addScaledVector(p.offset,t)); root.updateMatrixWorld(true);
  }
  const bounds = new Box3(); for (const t of [0,1]) {setExplosion(t);bounds.union(new Box3().setFromObject(root));} setExplosion(0);
  return {root,parts,bounds,setExplosion,dispose() {disposeParts(parts);root.clear();}};
}
