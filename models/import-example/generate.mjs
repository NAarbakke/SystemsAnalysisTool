// Small, self-contained mechanical fixture for exercising the local GLB importer.
import { mkdir, writeFile } from 'node:fs/promises';
const positions = new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]);
const indices = new Uint16Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]);
const binary = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);
const json = {
  asset:{version:'2.0',generator:'SystemsAnalysisTool import example'}, scene:0,
  scenes:[{nodes:[0]}],
  nodes:[
    {name:'Fixture assembly',children:[1,2,3]},
    {name:'Base plate',mesh:0,translation:[0,-1,0],scale:[2,.15,1.5]},
    {name:'Top plate',mesh:1,translation:[0,1,0],scale:[2,.15,1.5]},
    {name:'Supports',children:[4,5,6,7]},
    ...[[-1.6,0,-1.1],[1.6,0,-1.1],[-1.6,0,1.1],[1.6,0,1.1]].map((translation,i)=>({name:`Support ${i+1}`,mesh:2,translation,scale:[.18,.85,.18]})),
  ],
  meshes:[0,1,2].map(material=>({primitives:[{attributes:{POSITION:0},indices:1,material}]})),
  materials:[[.19,.43,.5,1],[.67,.73,.77,1],[.77,.55,.28,1]].map(baseColorFactor=>({pbrMetallicRoughness:{baseColorFactor,metallicFactor:.4,roughnessFactor:.35}})),
  buffers:[{byteLength:binary.length}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.byteLength,target:34962},{buffer:0,byteOffset:positions.byteLength,byteLength:indices.byteLength,target:34963}],
  accessors:[{bufferView:0,componentType:5126,count:8,type:'VEC3',min:[-1,-1,-1],max:[1,1,1]},{bufferView:1,componentType:5123,count:36,type:'SCALAR'}],
};
const source = Buffer.from(JSON.stringify(json));
const headerJson = Buffer.concat([source,Buffer.alloc((4-source.length%4)%4,0x20)]);
const total = 12+8+headerJson.length+8+binary.length;
const glb=Buffer.alloc(total); glb.writeUInt32LE(0x46546c67,0); glb.writeUInt32LE(2,4); glb.writeUInt32LE(total,8);
glb.writeUInt32LE(headerJson.length,12); glb.writeUInt32LE(0x4e4f534a,16); headerJson.copy(glb,20);
const binOffset=20+headerJson.length; glb.writeUInt32LE(binary.length,binOffset); glb.writeUInt32LE(0x004e4942,binOffset+4); binary.copy(glb,binOffset+8);
const directory=new URL('../../static/data/assembly-import/',import.meta.url);
await mkdir(directory,{recursive:true}); await writeFile(new URL('example.glb',directory),glb);
console.log('Wrote the six-part fixture example GLB.');
