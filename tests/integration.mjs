import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPyodide} from 'pyodide';
import occtFactory from 'occt-import-js';
import {demoParts,cadParts,meshParts,normalizeParts} from '../lib/models.ts';
const py=await loadPyodide();
py.runPython(await readFile('public/python/explosion.py','utf8'));
const fn=py.globals.get('plan_json');
function bounds(raw){return raw.map(p=>({center:p.geometry.boundingBox.getCenter({set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},addVectors(a,b){return this.set(a.x+b.x,a.y+b.y,a.z+b.z)},multiplyScalar(s){return this.set(this.x*s,this.y*s,this.z*s)},toArray(){return[this.x,this.y,this.z]}}).toArray(),size:[p.geometry.boundingBox.max.x-p.geometry.boundingBox.min.x,p.geometry.boundingBox.max.y-p.geometry.boundingBox.min.y,p.geometry.boundingBox.max.z-p.geometry.boundingBox.min.z]}));}
function plan(parts,mode){return JSON.parse(fn(JSON.stringify({parts,mode})));}
function checkSeparation(parts,result){assert.equal(result.offsets.length,parts.length);for(let i=0;i<parts.length;i++){assert(result.offsets[i].every(Number.isFinite));for(let j=0;j<i;j++){assert([0,1,2].some(k=>Math.abs(parts[i].center[k]+result.offsets[i][k]-parts[j].center[k]-result.offsets[j][k])>=(parts[i].size[k]+parts[j].size[k])/2-.00001),`Parts ${i} and ${j} overlap`);}}}
const demo=normalizeParts(demoParts()),demoBounds=bounds(demo);assert.equal(demo.length,13);
for(const mode of ['x','y','z','radial']){const result=plan(demoBounds,mode);checkSeparation(demoBounds,result);assert.deepEqual(result,plan(demoBounds,mode));assert(result.offsets.some(v=>v.some(x=>x!==0)));}
const concentric=Array.from({length:30},(_,i)=>({center:[0,0,0],size:[1+i/100,1,1]}));for(const mode of ['x','y','z','radial'])checkSeparation(concentric,plan(concentric,mode));
const fixed=structuredClone(demoBounds);fixed[1].direction='fixed';fixed[2].direction='-x';const custom=plan(fixed,'y');assert.deepEqual(custom.offsets[1],[0,0,0]);assert(custom.offsets[2][0]<0);assert.equal(custom.offsets[2][1],0);
assert.throws(()=>plan([],'radial'));assert.throws(()=>plan(demoBounds,'invalid'));assert.deepEqual(plan([{center:[0,0,0],size:[1,1,1]}],'radial').offsets,[[0,0,0]]);
console.log('PASS Python: all directions, concentric parts, deterministic packing, overrides, single solid, validation.');
const occt=await occtFactory();
for(const [method,path,count] of [['ReadStepFile','cax-if/as1_pe_203.stp',18],['ReadIgesFile','cube-10x10mm/Cube 10x10.igs',1],['ReadBrepFile','cax-if-brep/as1_pe_203.brep',18]]){
 const data=await readFile('node_modules/occt-import-js/test/testfiles/'+path);const imported=occt[method](data,{linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:.002,angularDeflection:.5});assert(imported.success);assert.equal(imported.meshes.length,count);const parts=normalizeParts(cadParts(imported));for(const mode of ['radial','x','y','z'])checkSeparation(bounds(parts),plan(bounds(parts),mode));console.log(`PASS ${method}: ${count} real CAD parts → Three.js geometry → Python exploded layout.`);parts.forEach(p=>p.geometry.dispose());
}
assert.throws(()=>cadParts(occt.ReadStepFile(new Uint8Array([1,2,3]),null)));
const obj=new File(['o Left\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\no Right\nv 3 0 0\nv 4 0 0\nv 3 1 0\nf 4 5 6'],'assembly.obj');assert.equal(normalizeParts(await meshParts(obj)).length,2);
const stl=new File([await readFile('node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.stl')],'cube.stl');assert.equal(normalizeParts(await meshParts(stl)).length,1);
// A GLB with repeated mesh instances and nested transforms checks world-space preservation.
const vertices=new Float32Array([0,0,0,1,0,0,0,1,0]);const document={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{translation:[2,0,0],children:[1,2]},{mesh:0,name:'First',translation:[0,1,0]},{mesh:0,name:'Second',translation:[3,1,0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],bufferViews:[{buffer:0,byteLength:36}],buffers:[{byteLength:36}]};let json=Buffer.from(JSON.stringify(document));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const binary=Buffer.from(vertices.buffer),glb=Buffer.alloc(12+8+json.length+8+binary.length);glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);glb.writeUInt32LE(binary.length,20+json.length);glb.writeUInt32LE(0x004e4942,24+json.length);binary.copy(glb,28+json.length);const imported=await meshParts(new File([glb],'test.glb'));assert.equal(imported.length,2);assert.equal(imported[0].geometry.getAttribute('position').getX(0),2);assert.equal(imported[1].geometry.getAttribute('position').getX(0),5);
console.log('PASS GLB transforms and repeated instances, OBJ components, STL, invalid CAD rejection.');
fn.destroy();demo.forEach(p=>p.geometry.dispose());
