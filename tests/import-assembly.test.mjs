import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {assemblyFromScene,inspectGLB,loadImportedAssembly,loadImportedFile,stepTree} from '../src/three/import/load.ts';

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
test('preserves nested component transforms; a part mounted on another lifts off and returns home',()=>{
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
  assert.ok(parent.getWorldPosition(new Vector3()).distanceTo(positions[0])<1e-8,'the base stays put');
  assert.ok(child.getWorldPosition(new Vector3()).distanceTo(positions[1])>.5,'the mounted part moves clear');
  assembly.setExplosion(0);
  [parent,child].forEach((mesh,i)=>assert.ok(mesh.position.distanceTo(original[i])<1e-8));
  assembly.dispose();
});
test('stacks lift in build order without passing through each other; sub-assemblies slide out sideways',()=>{
  const material=new MeshStandardMaterial(), content=new Group();
  const slab=(name,w,h,y,x=0)=>{ const mesh=new Mesh(new BoxGeometry(w,h,w),material); mesh.name=name; mesh.position.set(x,y,0); return mesh; };
  const base=slab('Base',10,1,0), board=slab('Board',4,.2,.6), lid=slab('Lid',8,.2,1.2);
  const arm=new Group(); arm.name='Arm'; arm.add(slab('Arm tube',3,.5,0,9), slab('Motor',1,1,.8,10));
  content.add(base,board,lid,arm);
  const assembly=assemblyFromScene(content);
  assembly.setExplosion(1);
  const boxes=Object.fromEntries(assembly.parts.map(p=>[p.mesh.name,new Box3().setFromObject(p.mesh)]));
  assert.ok(boxes.Board.min.y>boxes.Base.max.y && boxes.Lid.min.y>boxes.Board.max.y,'layers keep their order with clearance');
  assert.ok(Math.abs(boxes['Arm tube'].getCenter(new Vector3()).y-boxes.Base.getCenter(new Vector3()).y)<1e-8,'the arm slides out level');
  assert.ok(boxes['Arm tube'].min.x>boxes.Base.max.x,'the arm clears the base');
  assert.ok(boxes.Motor.min.y>boxes['Arm tube'].max.y,'the motor lifts off its arm');
  assert.ok(assembly.root.getObjectByName('Explosion trails').visible);
  assembly.setExplosion(0);
  assert.ok(!assembly.root.getObjectByName('Explosion trails').visible);
  assembly.dispose();
});
test('reads the Razorbill STEP product tree: part numbers, arms as sub-assemblies, electronics out of the top',async()=>{
  const {default:startKernel}=await import('occt-import-js');
  const kernel=await startKernel();
  const bytes=await readFile(new URL('../models/razorbill-farm-drone/2000_Razorbill_farm_drone.STEP',import.meta.url));
  const content=new Group(); content.add(stepTree(kernel.ReadStepFile(new Uint8Array(bytes),null)));
  const assembly=assemblyFromScene(content);
  assert.equal(assembly.parts.length,31);
  const find=id=>assembly.parts.filter(p=>p.mesh.userData.partId===id).map(p=>p.mesh);
  assert.equal(find('1150').length,4); assert.equal(find('1150')[0].name,'IFlight XING 2 2809 800KV motor');
  assert.equal(find('1140')[0].name,'Propellor');
  const centre=mesh=>new Box3().setFromObject(mesh).getCenter(new Vector3());
  const home=new Map(assembly.parts.map(p=>[p.mesh,centre(p.mesh)]));
  assembly.setExplosion(1);
  const lift=mesh=>centre(mesh).sub(home.get(mesh));
  for (const tube of find('1110')) { const d=lift(tube); assert.ok(Math.abs(d.y)<1e-8 && Math.hypot(d.x,d.z)>.5,'arms slide out level'); }
  const order=['1270','1281','1282','1220','1260'].map(id=>centre(find(id)[0]).y);
  assert.deepEqual([...order].sort((a,b)=>a-b),order,'GPS, ESC, flight controller, top plate and battery stack upwards');
  assert.ok(lift(find('1281')[0]).y>0,'the electronics leave through the open top');
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
test('reads a binary STL as one part and refuses unsupported extensions',async()=>{
  const triangles=[[[0,0,0],[4,0,0],[0,4,0]],[[0,0,0],[4,0,0],[0,0,4]]];
  const stl=Buffer.alloc(84+50*triangles.length); stl.writeUInt32LE(triangles.length,80);
  triangles.forEach((corners,index)=>{
    const start=84+50*index;
    [[0,0,1],...corners].flat().forEach((value,i)=>stl.writeFloatLE(value,start+4*i));
  });
  const {assembly}=await loadImportedFile(stl.buffer.slice(stl.byteOffset,stl.byteOffset+stl.byteLength),'bracket.stl');
  assert.equal(assembly.parts.length,1);
  assert.equal(assembly.parts[0].mesh.name,'bracket');
  assert.ok(!assembly.bounds.isEmpty());
  assembly.dispose();
  await assert.rejects(async()=>loadImportedFile(new ArrayBuffer(8),'part.iges'),/\.glb, \.stl/);
});
