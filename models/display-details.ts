import { Box3, BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, LatheGeometry, TubeGeometry, Vector2, Vector3, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Assembly, AssemblyPart } from '../src/assembly.ts';

export type Detail = { geometry:BufferGeometry; color:string; metalness?:number; roughness?:number };
/** Merge decorative detail by finish, keeping one selectable mesh per component. */
export function detailMesh(mesh:Mesh, details:Detail[]) {
 if(!details.length)return;
 const groups=new Map<string,{detail:Detail;list:BufferGeometry[]}>();
 for(const detail of details){const key=`${detail.color}|${detail.metalness??.65}|${detail.roughness??.28}`;if(!groups.has(key))groups.set(key,{detail,list:[]});groups.get(key)!.list.push(detail.geometry);}
 if(!mesh.geometry.getAttribute('uv'))mesh.geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(mesh.geometry.getAttribute('position').count*2),2));
 const geometries=[mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry];
 const materials:Material[] = [mesh.material as Material];
 for(const {detail,list} of groups.values()){
  const flat=list.map(g=>g.index?g.toNonIndexed():g),combined=mergeGeometries(flat)!;
  new Set([...list,...flat]).forEach(g=>g.dispose());geometries.push(combined);
  materials.push(finish(detail.color,detail.metalness??.65,detail.roughness??.28,'Detail finish '+detail.color));
 }
 const merged=mergeGeometries(geometries,true)!;
 new Set([mesh.geometry,...geometries]).forEach(g=>g.dispose());mesh.geometry=merged;mesh.material=materials;
}
/** Double-sided so cutaway shells show their inner faces. */
export function finish(color:string,metalness=.65,roughness=.3,name=color){
 const material=new MeshStandardMaterial({color,metalness,roughness,side:DoubleSide});material.name=name;return material;
}
export function box(w:number,h:number,d:number,x=0,y=0,z=0){return new BoxGeometry(w,h,d).translate(x,y,z);}
export function band(radius:number,tube:number,y=0){return new TorusGeometry(radius,tube,12,160).rotateX(Math.PI/2).translate(0,y,0);}
export function bolt(radius:number,y:number,angle:number,size=.07){return new CylinderGeometry(size,size,size,6).translate(radius*Math.cos(angle),y,radius*Math.sin(angle));}
export function bearingDetails(radius:number,y=0):Detail[]{return Array.from({length:12},(_,i)=>({geometry:new SphereGeometry(.065,24,16).translate(radius*Math.cos(i*Math.PI/6),y,radius*Math.sin(i*Math.PI/6)),color:'#c5ced3'}));}
export function disposeParts(parts:AssemblyPart[]) {
 const geometries=new Set(parts.map(p=>p.mesh.geometry)),materials=new Set(parts.flatMap(p=>Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material]));
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
/** Beveled shoulders and curved tubing for illustrative display geometry. */
export function machinedRing(outer:number,inner:number,height:number,segments=128){
 const b=Math.min(.025,height/5,(outer-inner)/4),h=height/2;
 return new LatheGeometry([[inner,-h+b],[inner+b,-h],[outer-b,-h],[outer,-h+b],[outer,h-b],[outer-b,h],[inner+b,h],[inner,h-b],[inner,-h+b]].map(([r,y])=>new Vector2(r,y)),segments);
}
export function tube(points:[number,number,number][],radius=.025,segments=48){
 return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments,radius,12,false);
}

/**
 * Lathe about Y with a hard edge at every profile corner, so machined shoulders read crisply
 * instead of the smeared shading LatheGeometry gives. Profile is [radius, y], walked in order;
 * `smooth` joins corners gentler than ~30° for curved profiles. Optional arc makes cutaways.
 */
export function revolve(profile:[number,number][], segments=160, arc=Math.PI*2, start=0, smooth=true){
 const pts=profile.filter((p,i)=>i===0||Math.hypot(p[0]-profile[i-1][0],p[1]-profile[i-1][1])>1e-9);
 const area=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-q[0]*p[1];},0);
 const flip=area<0?-1:1; // counter-clockwise in (r,y) means outward is (dy,-dr)
 const normalOf=(a:[number,number],b:[number,number])=>{const dr=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dr,dy);return [flip*dy/l,-flip*dr/l];};
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
 let length=0;const total=pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0)||1;
 for(let k=0;k<pts.length-1;k++){
  const a=pts[k],b=pts[k+1];if(a[0]<1e-9&&b[0]<1e-9)continue;
  let na=normalOf(a,b),nb=na;
  if(smooth){
   const prev=k>0?normalOf(pts[k-1],a):undefined,next=k<pts.length-2?normalOf(b,pts[k+2]):undefined;
   const blend=(n:number[],m?:number[])=>m&&n[0]*m[0]+n[1]*m[1]>.85?(()=>{const s=[n[0]+m[0],n[1]+m[1]],l=Math.hypot(s[0],s[1]);return [s[0]/l,s[1]/l];})():n;
   na=blend(na,prev);nb=blend(nb,next);
  }
  const base=positions.length/3,seg=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let i=0;i<=segments;i++){
   const phi=start+arc*i/segments,s=Math.sin(phi),c=Math.cos(phi);
   for(const [p,n,v] of [[a,na,length],[b,nb,length+seg]] as const){
    positions.push(p[0]*s,p[1],p[0]*c);normals.push(n[0]*s,n[1],n[0]*c);uvs.push(i/segments,v/total);
   }
  }
  length+=seg;
  for(let i=0;i<segments;i++){const q=base+i*2;indices.push(q,q+2,q+1,q+1,q+2,q+3);}
 }
 const g=new BufferGeometry();
 g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('normal',new Float32BufferAttribute(normals,3));g.setAttribute('uv',new Float32BufferAttribute(uvs,2));g.setIndex(indices);
 orient(g);return g;
}
/** Wind triangles to agree with the authored normals so front faces point outward. */
function orient(g:BufferGeometry){
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),index=g.index!;const a=new Vector3(),b=new Vector3(),c=new Vector3();
 for(let t=0;t<index.count;t+=3){
  const [i,j,k]=[index.getX(t),index.getX(t+1),index.getX(t+2)];
  a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,j).sub(a);c.fromBufferAttribute(p,k).sub(a);b.cross(c);
  if(b.lengthSq()>0&&b.dot(a.fromBufferAttribute(n,i))<0){index.setX(t+1,k);index.setX(t+2,j);}
 }
}
/** Round hoop (a torus about Y) that can follow a cutaway arc. */
export function hoop(radius:number,y:number,thickness:number,arc=Math.PI*2,start=0){
 return revolve(Array.from({length:13},(_,i)=>{const a=i/12*Math.PI*2;return [radius+thickness*Math.cos(a),y+thickness*Math.sin(a)] as [number,number];}),112,arc,start);
}
/** Chamfered rectangular section [inner..outer] x [y0..y1] for rings, spacers and nuts. */
export function ring(inner:number,outer:number,y0:number,y1:number,c=.012){
 c=Math.min(c,(outer-inner)/3,(y1-y0)/3);
 return revolve([[inner+c,y0],[outer-c,y0],[outer,y0+c],[outer,y1-c],[outer-c,y1],[inner+c,y1],[inner,y1-c],[inner,y0+c],[inner+c,y0]],160,Math.PI*2,0,false);
}

/**
 * Rolling bearing about Y: outer ring as the base geometry, inner ring, rolling elements and
 * cage as detail. Proportions follow a generic ball or cylindrical-roller bearing section.
 */
export function bearing(inner:number,outer:number,y0:number,y1:number,type:'ball'|'roller'='ball'){
 const w=y1-y0,section=outer-inner,pitch=(inner+outer)/2,d=Math.min(section*.5,w*.62),yc=(y0+y1)/2;
 const race=section*.24;
 const outerRing=ring(outer-race,outer,y0,y1,.008),details:Detail[]=[{geometry:ring(inner,inner+race,y0,y1,.008),color:'#d4d9dc',metalness:1,roughness:.16}];
 const count=Math.floor(Math.PI*2*pitch/(d*1.35));
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2,x=pitch*Math.cos(a),z=pitch*Math.sin(a);
  const element=type==='ball'?new SphereGeometry(d/2,20,14):new CylinderGeometry(d/2,d/2,w*.72,20);
  details.push({geometry:element.translate(x,yc,z),color:'#e2e5e7',metalness:1,roughness:.1});
 }
 // Cage: two thin rails either side of the rolling elements.
 for(const s of [-1,1])details.push({geometry:ring(pitch-d*.22,pitch+d*.22,yc+s*d*.5-d*.08,yc+s*d*.5+d*.08,.003),color:'#b0873e',metalness:.8,roughness:.35});
 return {outerRing,details};
}

/**
 * Airfoil blade row about Y (axial). Sections are a NACA-style thickness form on a
 * cambered line, staggered and twisted from hub to tip, then wrapped onto the radius.
 * Illustrative shapes only; not an aerodynamic design.
 */
export function bladeRow(o:{count:number;hub:number;tip:number;y:number;chord:[number,number];stagger:[number,number];camber?:number;thickness?:number;sweep?:number;lean?:number;phase?:number}){
 const {count,hub,tip,y}=o,camber=o.camber??.06,tmax=o.thickness??.1;
 // Small core blades are seen from afar: fewer sections keep a thousand-blade engine light.
 const large=tip-hub>.5,N=large?14:6,S=large?8:2;
 const geometries:BufferGeometry[]=[];
 const section:number[][]=[];
 for(let k=0;k<=N;k++){const x=(1-Math.cos(Math.PI*k/N))/2;section.push([x,5*tmax*(.2969*Math.sqrt(x)-.126*x-.3516*x*x+.2843*x**3-.1036*x**4),camber*4*x*(1-x)]);}
 for(let b=0;b<count;b++){
  const theta0=(b+(o.phase??0))/count*Math.PI*2,positions:number[]=[],indices:number[]=[];
  const loop=2*N;
  for(let j=0;j<=S;j++){
   const t=j/S,r=hub+(tip-hub)*t,chord=o.chord[0]+(o.chord[1]-o.chord[0])*t,beta=o.stagger[0]+(o.stagger[1]-o.stagger[0])*t;
   const ySweep=(o.sweep??0)*t*t,lean=(o.lean??0)*t*t,cb=Math.cos(beta),sb=Math.sin(beta);
   for(let k=0;k<loop;k++){
    const upper=k<=N,idx=upper?k:loop-k,[x,half,mid]=section[idx];
    const s=(x-.5)*chord,n=(mid+(upper?half:-half))*chord;
    const axial=s*cb-n*sb,tangential=s*sb+n*cb+lean,theta=theta0+tangential/r;
    positions.push(r*Math.cos(theta),y+axial+ySweep,r*Math.sin(theta));
   }
  }
  for(let j=0;j<S;j++)for(let k=0;k<loop;k++){const a=j*loop+k,b2=j*loop+(k+1)%loop,c=a+loop,d=b2+loop;indices.push(a,c,b2,b2,c,d);}
  // Smooth normals over the airfoil surface; the flat root and tip caps keep their own hard edge.
  const side=new BufferGeometry();side.setAttribute('position',new Float32BufferAttribute(positions,3));side.setIndex(indices);side.computeVertexNormals();
  const cap:number[]=[];
  for(const j of [0,S]){
   const at=(k:number)=>positions.slice((j*loop+k%loop)*3,(j*loop+k%loop)*3+3);
   const centre=[0,1,2].map(a=>Array.from({length:loop},(_,k)=>at(k)[a]).reduce((s,v)=>s+v,0)/loop);
   for(let k=0;k<loop;k++)cap.push(...centre,...(j?at(k):at(k+1)),...(j?at(k+1):at(k)));
  }
  const caps=new BufferGeometry();caps.setAttribute('position',new Float32BufferAttribute(cap,3));caps.computeVertexNormals();
  for(const g of [side.toNonIndexed(),caps]){g.setAttribute('uv',new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));geometries.push(g);}
  side.dispose();
 }
 const merged=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());return merged;
}

/** Radial repeats of a small part (bolts, fins, spokes) about Y. */
export function around(count:number,make:(i:number)=>BufferGeometry,phase=0){
 return Array.from({length:count},(_,i)=>make(i).rotateY(-(i+phase)/count*Math.PI*2));
}

/**
 * Shared scaffolding for the authored assemblies. Parts are modelled about a Y axis in place
 * (mesh at the origin); `horizontal` turns that axis to world X. Offsets are in the same frame.
 */
export function assemblyBuilder(name:string,horizontal=false){
 const root=new Group();root.name=name;
 const frame=new Group();if(horizontal)frame.rotation.z=-Math.PI/2;root.add(frame);
 const parts:AssemblyPart[]=[];
 function add(partName:string,geometry:BufferGeometry,material:Material,offset:[number,number,number],userData:Record<string,unknown>={},details:Detail[]=[]){
  const mesh=new Mesh(geometry,material);mesh.name=partName;
  mesh.userData={partId:partName.toLowerCase().replace(/[^a-z0-9]+/g,'-'),...userData};
  detailMesh(mesh,details);frame.add(mesh);
  parts.push({mesh,home:mesh.position.clone(),offset:new Vector3(...offset)});return mesh;
 }
 function done():Assembly{
  function setExplosion(amount:number){
   const t=Number.isFinite(amount)?Math.min(1,Math.max(0,amount)):0;
   parts.forEach(p=>p.mesh.position.copy(p.home).addScaledVector(p.offset,t));root.updateMatrixWorld(true);
  }
  const bounds=new Box3();for(const t of [0,1]){setExplosion(t);bounds.union(new Box3().setFromObject(root));}setExplosion(0);
  return {root,parts,bounds,setExplosion,dispose(){disposeParts(parts);frame.clear();root.clear();}};
 }
 return {add,done};
}
