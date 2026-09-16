import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {assemblyFromScene,inspectGLB,loadImportedAssembly} from '../src/import-assembly.ts';

function jsonGLB(json) {
  const source=Buffer.from(JSON.stringify(json)); const length=Math.ceil(source.length/4)*4;
  const buffer=Buffer.alloc(20+length,0x20); buffer.writeUInt32LE(0x46546c67,0); buffer.writeUInt32LE(2,4); buffer.writeUInt32LE(buffer.length,8); buffer.writeUInt32LE(length,12); buffer.writeUInt32LE(0x4e4f534a,16); source.copy(buffer,20);
  return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
}
test('rejects truncated GLBs, external resources and unsupported compression before loading',()=>{
  assert.throws(()=>inspectGLB(new ArrayBuffer(4)));
  assert.throws(()=>inspectGLB(jsonGLB({asset:{version:'2.0'},buffers:[{uri:'https://example.com/model.bin'}]})),/external/);
  assert.throws(()=>inspectGLB(jsonGLB({asset:{version:'2.0'},extensionsUsed:['KHR_draco_mesh_compression']})),/Draco/);
  assert.throws(()=>inspectGLB(jsonGLB({asset:{version:'2.0'},skins:[{}]})),/skinning/);
});
test('preserves nested component transforms; spread moves each mesh once and restores original positions',()=>{
  const content=new Group(), parent=new Mesh(new BoxGeometry(),new MeshStandardMaterial()), child=new Mesh(new BoxGeometry(),parent.material);
  parent.position.set(20,4,-10); parent.rotation.z=.4; parent.scale.set(2,1,3); child.position.set(2,3,1); parent.add(child); content.add(parent);
  const original=[parent.position.clone(),child.position.clone()];
  const assembly=assemblyFromScene(content);
  assert.equal(child.parent,parent); assert.equal(assembly.parts.length,2);
  const box=new Box3().setFromObject(assembly.root);
  assert.ok(box.getCenter(new Vector3()).length()<1e-8);
  assert.ok(Math.abs(Math.max(...box.getSize(new Vector3()).toArray())-8)<1e-8);
  const positions=[parent,child].map(mesh=>mesh.getWorldPosition(new Vector3()));
  assembly.setExplosion(1);
  [parent,child].forEach((mesh,i)=>assert.ok(Math.abs(mesh.getWorldPosition(new Vector3()).distanceTo(positions[i])-3.2)<1e-8));
  assembly.setExplosion(0);
  [parent,child].forEach((mesh,i)=>assert.ok(mesh.position.distanceTo(original[i])<1e-8));
  assembly.dispose();
});
test('loads the self-contained six-part GLB with names, materials and nested support hierarchy',async()=>{
  const bytes=await readFile(new URL('../static/data/assembly-import/example.glb',import.meta.url));
  const {assembly}=await loadImportedAssembly(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert.equal(assembly.parts.length,6);
  assert.equal(assembly.root.getObjectByName('Supports').children.length,4);
  assert.ok(assembly.parts.some(part=>part.mesh.name==='Base_plate'));
  assembly.setExplosion(.5); assembly.setExplosion(0); assert.ok(!assembly.bounds.isEmpty()); assembly.dispose();
});
