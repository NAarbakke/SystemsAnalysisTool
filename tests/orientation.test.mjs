import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { fromEulerDegrees, fromQuaternion, toEulerDegrees } from '../src/orientation.ts';
import { models } from '../models/index.ts';

test('positive X rotation sends model Y to world Z; quaternion input agrees', () => {
  const euler = fromEulerDegrees([90, 0, 0]);
  const quaternion = fromQuaternion([2, 0, 0, 2]);
  for (const rotation of [euler, quaternion]) {
    assert.ok(new Vector3(0, 1, 0).applyQuaternion(rotation).distanceTo(new Vector3(0, 0, 1)) < 1e-12);
  }
});

test('format conversion preserves compound rotations including Euler singularities', () => {
  for (const angles of [[23, -41, 72], [0, 90, 35], [180, -90, -150]]) {
    const q = fromEulerDegrees(angles);
    assert.ok(1 - Math.abs(q.dot(fromEulerDegrees(toEulerDegrees(q)))) < 1e-12);
  }
  assert.ok(Math.abs(fromQuaternion([1e308, 1e308, 1e308, 1e308]).length() - 1) < 1e-12);
  assert.throws(() => fromQuaternion([0, 0, 0, 0]));
  assert.throws(() => fromQuaternion([0, NaN, 0, 1]));
  assert.throws(() => fromEulerDegrees([Infinity, 0, 0]));
});

test('rotation and partial separation compose in every model without changing local geometry', () => {
  for (const definition of models) {
    const model = definition.create();
    model.root.quaternion.copy(fromEulerDegrees([90, 0, 0]));
    model.setExplosion(0.37);
    for (const part of model.parts) {
      const local = part.home.clone().addScaledVector(part.offset, 0.37);
      const expectedWorld = new Vector3(local.x, -local.z, local.y);
      assert.ok(part.mesh.getWorldPosition(new Vector3()).distanceTo(expectedWorld) < 1e-10);
    }
    model.dispose();
  }
});
