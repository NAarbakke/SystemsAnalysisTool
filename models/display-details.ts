import { BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, LatheGeometry, TubeGeometry, Vector2, Vector3, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AssemblyPart } from '../src/assembly.ts';

export type Detail = { geometry:BufferGeometry; color:string };
/** Merge decorative detail by finish, keeping one selectable mesh per component. */
export function detailMesh(mesh:Mesh, details:Detail[]) {
 if(!details.length)return;
 const groups=new Map<string,BufferGeometry[]>();
 for(const detail of details){if(!groups.has(detail.color))groups.set(detail.color,[]);groups.get(detail.color)!.push(detail.geometry);}
 if(!mesh.geometry.getAttribute('uv'))mesh.geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(mesh.geometry.getAttribute('position').count*2),2));
 const geometries=[mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry];
 const materials:Material[] = [mesh.material as Material];
 for(const [color,list] of groups){
  const flat=list.map(g=>g.index?g.toNonIndexed():g),combined=mergeGeometries(flat)!;
  new Set([...list,...flat]).forEach(g=>g.dispose());geometries.push(combined);
  const material=new MeshStandardMaterial({color,metalness:.65,roughness:.28});material.name='Detail finish '+color;materials.push(material);
 }
 const merged=mergeGeometries(geometries,true)!;
 new Set([mesh.geometry,...geometries]).forEach(g=>g.dispose());mesh.geometry=merged;mesh.material=materials;
}
export function box(w:number,h:number,d:number,x=0,y=0,z=0){return new BoxGeometry(w,h,d).translate(x,y,z);}
export function band(radius:number,tube:number,y=0){return new TorusGeometry(radius,tube,6,48).rotateX(Math.PI/2).translate(0,y,0);}
export function bolt(radius:number,y:number,angle:number){return new CylinderGeometry(.07,.07,.07,6).translate(radius*Math.cos(angle),y,radius*Math.sin(angle));}
export function bearingDetails(radius:number,y=0):Detail[]{return Array.from({length:12},(_,i)=>({geometry:new SphereGeometry(.065,10,6).translate(radius*Math.cos(i*Math.PI/6),y,radius*Math.sin(i*Math.PI/6)),color:'#c5ced3'}));}
export function disposeParts(parts:AssemblyPart[]) {
 const geometries=new Set(parts.map(p=>p.mesh.geometry)),materials=new Set(parts.flatMap(p=>Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material]));
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
/** Beveled shoulders and curved tubing for illustrative display geometry. */
export function machinedRing(outer:number,inner:number,height:number,segments=80){
 const b=Math.min(.025,height/5,(outer-inner)/4),h=height/2;
 return new LatheGeometry([[inner,-h+b],[inner+b,-h],[outer-b,-h],[outer,-h+b],[outer,h-b],[outer-b,h],[inner+b,h],[inner,h-b],[inner,-h+b]].map(([r,y])=>new Vector2(r,y)),segments);
}
export function tube(points:[number,number,number][],radius=.025,segments=24){
 return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments,radius,6,false);
}
