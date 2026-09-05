import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
export type RawPart={name:string;geometry:T.BufferGeometry;color:T.Color};
const silver=new T.Color('#aabbb4'),green=new T.Color('#548978'),dark=new T.Color('#364c45'),brass=new T.Color('#c5a66b');
export function demoParts():RawPart[]{
 const out:RawPart[]=[];
 const add=(name:string,g:T.BufferGeometry,y:number,c=silver,x=0,z=0)=>{g.translate(x,y,z);out.push({name,geometry:g,color:c});};
 const ring=(outer:number,inner:number,h:number)=>new T.LatheGeometry([new T.Vector2(inner,-h/2),new T.Vector2(outer,-h/2),new T.Vector2(outer,h/2),new T.Vector2(inner,h/2),new T.Vector2(inner,-h/2)],80);
 add('Mounting flange',ring(1.35,.48,.28),-1.4,green);
 add('Bearing housing',ring(.94,.56,1.4),-.56,green);
 add('Lower bearing',ring(.55,.29,.24),-1.1,brass);
 add('Upper bearing',ring(.55,.29,.24),.03,brass);
 add('Spindle shaft',new T.CylinderGeometry(.28,.28,3.5,64),.12,silver);
 add('Rotor hub',ring(.76,.29,.48),.62,dark);
 add('Retaining washer',ring(.49,.29,.08),.92,silver);
 add('Top collar',ring(.48,.29,.24),1.1,green);
 add('Lock nut',ring(.42,.29,.22),1.34,brass);
 for(let i=0;i<4;i++){const angle=i*Math.PI/2;add(`Flange screw ${i+1}`,new T.CylinderGeometry(.105,.105,.42,6),-1.3,dark,Math.cos(angle)*1.08,Math.sin(angle)*1.08);}
 return out;
}
export type CadResult={success:boolean;meshes:{name:string;color?:number[];attributes:{position:{array:number[]};normal?:{array:number[]}};index:{array:number[]}}[]};
export function cadParts(result:CadResult):RawPart[]{
 if(!result.success||!result.meshes?.length)throw new Error('No solid parts found. Export a STEP assembly with separate bodies and try again.');
 return result.meshes.map((m,i)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.attributes.position.array,3));g.setIndex(m.index.array);if(m.attributes.normal)g.setAttribute('normal',new T.Float32BufferAttribute(m.attributes.normal.array,3));else g.computeVertexNormals();return{name:m.name||`Part ${i+1}`,geometry:g,color:m.color?new T.Color().setRGB(m.color[0],m.color[1],m.color[2],T.SRGBColorSpace):silver.clone()};});
}
export async function meshParts(file:File):Promise<RawPart[]>{
 const ext=file.name.split('.').pop()?.toLowerCase();
 if(ext==='stl'){const g=new STLLoader().parse(await file.arrayBuffer());return [{name:file.name,geometry:g,color:silver.clone()}];}
 let root:T.Object3D;
 if(ext==='obj')root=new OBJLoader().parse(await file.text());
 else{
  const manager=new T.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('data:')&&!url.startsWith('blob:'))throw new Error('GLB must embed all geometry and textures.');return url;});
  root=(await new GLTFLoader(manager).parseAsync(await file.arrayBuffer(), '')).scene;
 }
 root.updateMatrixWorld(true);const out:RawPart[]=[];
 root.traverse(obj=>{if(obj instanceof T.Mesh){if(obj instanceof T.SkinnedMesh||obj instanceof T.InstancedMesh)throw new Error('Export static, separate meshes before importing this model.');const mat=Array.isArray(obj.material)?obj.material[0]:obj.material;out.push({name:obj.name||`Part ${out.length+1}`,geometry:obj.geometry.clone().applyMatrix4(obj.matrixWorld),color:mat.color?.clone()??silver.clone()});}});
 return out;
}
export function normalizeParts(raw:RawPart[]):RawPart[]{
 if(!raw.length)throw new Error('No mesh geometry found in the model.');
 if(raw.length>500)throw new Error('This model has more than 500 parts. Import a smaller subassembly.');
 const bounds=new T.Box3();let triangles=0;
 for(const p of raw){const a=p.geometry.getAttribute('position');if(!a?.count)throw new Error('Model contains empty geometry.');for(let i=0;i<a.array.length;i++)if(!Number.isFinite(a.array[i]))throw new Error('Model contains invalid coordinates.');triangles+=(p.geometry.index?.count??a.count)/3;p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox!);}
 if(triangles>2000000)throw new Error('Model exceeds 2 million triangles. Export a coarser mesh or smaller assembly.');
 const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const scale=4/Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(scale)||scale<=0)throw new Error('Model has no measurable volume.');
 for(const p of raw){p.geometry.translate(-center.x,-center.y,-center.z);p.geometry.scale(scale,scale,scale);p.geometry.computeBoundingBox();}
 return raw;
}
