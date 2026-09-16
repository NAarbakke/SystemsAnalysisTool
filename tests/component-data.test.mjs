import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readComponentInfo, readComponentStages } from '../src/component-data.ts';
import { createIndustrialMotor } from '../models/industrial-motor/model.ts';
test('component metadata rejects nonphysical mass and malformed readings but preserves zero',()=>{
  assert.deepEqual(readComponentInfo({material:'Steel',massKg:-1}),{material:'Steel'});
  assert.deepEqual(readComponentInfo(null),{});
  const data=readComponentStages([{id:'a',label:'Snapshot',readings:[{label:'Speed',value:0,unit:'rpm'},{label:'Bad',value:Infinity}]},{id:'a',label:'Duplicate',readings:[]}]);
  assert.equal(data.length,1); assert.deepEqual(data[0].readings,[{label:'Speed',value:0,unit:'rpm'}]);
});
test('civilian motor has section-specific, labeled demo readings and reversible separation',()=>{
  const motor=createIndustrialMotor();
  assert.equal(motor.parts.length,8);
  for (const part of motor.parts) {
    assert.match(part.mesh.userData.operatingDataSource,/Synthetic/);
    assert.ok(readComponentInfo(part.mesh.userData.componentInfo).material);
    assert.equal(readComponentStages(part.mesh.userData.operatingStages).length,1);
  }
  const bearing=motor.parts.find(p=>p.mesh.name==='Drive-end bearing');
  assert.ok(readComponentStages(bearing.mesh.userData.operatingStages)[0].readings.some(r=>r.label==='Oil supply pressure'&&r.unit==='bar(g)'));
  const stator=motor.parts.find(p=>p.mesh.name==='Stator');
  assert.ok(!readComponentStages(stator.mesh.userData.operatingStages)[0].readings.some(r=>r.unit==='rpm'));
  motor.setExplosion(1); motor.setExplosion(0);
  motor.parts.forEach(p=>assert.ok(p.mesh.position.distanceTo(p.home)<1e-10)); motor.dispose();
});
