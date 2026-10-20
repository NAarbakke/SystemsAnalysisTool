import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import { fromEuler, fromQuaternion } from '../src/views/flyover/flight/attitude.ts';
import { parseFlight } from '../src/views/flyover/flight/data.ts';
import { defaultStateOptions, parseStateVector } from '../src/views/flyover/flight/state-vector.ts';
import { assemblyModels } from '../models/assemblies/index.ts';

test('positive roll sends body Y to reference Z; quaternion input agrees', () => {
  for (const rotation of [fromEuler([90, 0, 0]), fromEuler([Math.PI / 2, 0, 0], 'radians'), fromQuaternion([2, 0, 0, 2])]) {
    assert.ok(new Vector3(0, 1, 0).applyQuaternion(rotation).distanceTo(new Vector3(0, 0, 1)) < 1e-12);
  }
});

test('quaternion input is scaled safely and rejects degenerate values', () => {
  assert.ok(Math.abs(fromQuaternion([1e308, 1e308, 1e308, 1e308]).length() - 1) < 1e-12);
  assert.throws(() => fromQuaternion([0, 0, 0, 0]));
  assert.throws(() => fromQuaternion([0, NaN, 0, 1]));
});

test('position-series angles and 6DOF Euler state give the same ECEF attitude', () => {
  const flight = parseFlight('time,latitude,longitude,altitude,roll,pitch,yaw\n0,45,10,1000,10,20,30\n1,45,10.01,1000,10,20,30');
  const options = { ...defaultStateOptions, dof: '6' };
  const state = parseStateVector('time,latitude,longitude,altitude,vx,vy,vz,roll,pitch,yaw,p,q,r\n0,45,10,1000,1,0,0,10,20,30,0,0,0\n1,45,10.01,1000,1,0,0,10,20,30,0,0,0', options);
  const [a, b] = [flight[0].attitudeECEF, state[0].attitudeECEF];
  assert.ok(Math.abs(Math.abs(a.reduce((sum, v, i) => sum + v * b[i], 0)) - 1) < 1e-12);
});

test('rotation and partial separation compose in every model without changing local geometry', async () => {
  for (const definition of assemblyModels.filter(model => !model.browserOnly)) {
    const model = await definition.create();
    model.root.quaternion.copy(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
    model.setExplosion(0.37);
    for (const part of model.parts) {
      const local = part.home.clone().addScaledVector(part.offset, 0.37);
      // Authored assemblies hang their parts on a frame inside the root; horizontal ones turn that frame.
      const inRoot = part.mesh.parent === model.root ? local : local.applyMatrix4(part.mesh.parent.matrix);
      const expected = inRoot.applyQuaternion(model.root.quaternion);
      assert.ok(part.mesh.getWorldPosition(new Vector3()).distanceTo(expected) < 1e-10);
    }
    model.dispose();
  }
});
