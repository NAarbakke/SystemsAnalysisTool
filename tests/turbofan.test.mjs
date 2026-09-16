import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from 'three';
import { createTurbofan } from '../models/turbofan/model.ts';
test('display turbofan has ten selectable sections, finite geometry and reversible separation',()=>{
  const model = createTurbofan();
  assert.equal(model.parts.length,10);
  assert.equal(new Set(model.parts.map(p=>p.mesh.userData.partId)).size,10);
  let triangles=0;
  for (const p of model.parts) {
    assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
    triangles+=(p.mesh.geometry.index?.count ?? p.mesh.geometry.attributes.position.count)/3;
  }
  assert.ok(triangles<50000);
  for (const t of [0,.5,1]) {model.setExplosion(t);const box=new Box3().setFromObject(model.root);assert.ok(model.bounds.clone().expandByScalar(1e-6).containsBox(box));}
  model.setExplosion(0);model.parts.forEach(p=>assert.ok(p.mesh.position.distanceTo(p.home)<1e-10));model.dispose();
});
