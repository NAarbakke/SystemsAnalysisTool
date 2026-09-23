import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from 'three';
import { models } from '../models/index.ts';

for (const definition of models) {
  test(`${definition.id}: geometry budget, bounds, and component identities`, () => {
    const model = definition.create();
    try {
      assert.ok(model.parts.length > 0);
      assert.equal(new Set(model.parts.map(p => p.mesh.userData.partId)).size, model.parts.length);
      let triangles = 0;
      model.root.traverse(object => {
        if (!(object instanceof Mesh)) return;
        triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
        for (const value of object.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
      });
      // Authored models are a few hundred thousand triangles; frames render only on interaction.
      assert.ok(triangles < 400000, `Triangle count: ${triangles}`);
      console.log(`${definition.title}: ${model.parts.length} pieces, ${triangles} triangles.`);
      assert.ok(!model.bounds.isEmpty());
      for (const t of [0, .5, 1]) {
        model.setExplosion(t);
        for (const part of model.parts) assert.ok(model.bounds.containsPoint(part.mesh.getWorldPosition(part.home.clone())));
      }
    } finally { model.dispose(); }
  });

  test(`${definition.id}: reversible animation and shared-resource cleanup`, () => {
    const model = definition.create();
    const geometryIds = model.parts.map(p => p.mesh.geometry.uuid);
    model.setExplosion(1);
    for (const { mesh, home, offset } of model.parts) assert.ok(mesh.position.distanceTo(home.clone().add(offset)) < 1e-10);
    model.setExplosion(.37);
    model.setExplosion(0);
    for (const { mesh, home } of model.parts) assert.ok(mesh.position.equals(home));
    assert.deepEqual(model.parts.map(p => p.mesh.geometry.uuid), geometryIds);
    model.setExplosion(NaN);
    for (const { mesh } of model.parts) assert.ok(mesh.position.toArray().every(Number.isFinite));
    const resources = new Map();
    model.root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const resource of [object.geometry, ...[object.material].flat()]) resources.set(resource, 0);
    });
    for (const resource of resources.keys()) resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
    model.dispose();
    for (const count of resources.values()) assert.equal(count, 1);
    assert.equal(model.root.children.length, 0);
  });
}
