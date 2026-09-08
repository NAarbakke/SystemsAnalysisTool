import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartesian3, Matrix3, Quaternion } from 'cesium';
import { defaultStateOptions, parseStateVector, stateHeader, exampleState, interpolateState } from '../src/state-vector.ts';
import { createFlightPath } from '../src/flight-path.ts';

const near = (actual, expected) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-7, `${actual} != ${expected}`));
const rotate = (q, vector) => {
  const result = Matrix3.multiplyByVector(Matrix3.fromQuaternion(new Quaternion(...q)), new Cartesian3(...vector), new Cartesian3());
  return [result.x, result.y, result.z];
};

test('3DOF ENU and NED velocities convert into ECEF at a known location', () => {
  for (const [velocity, expected] of [['enu', [30, 10, 20]], ['ned', [-30, 20, 10]], ['ecef', [10, 20, 30]]]) {
    const options = { ...defaultStateOptions, velocity };
    const samples = parseStateVector(`${stateHeader(options)}\n10,0,0,1000,10,20,30\n12,0,0,2000,10,20,30`, options);
    near(samples[0].velocityECEF, expected);
    assert.equal(samples[1].time, 2);
    assert.equal(samples[0].attitudeECEF, undefined);
  }
});

test('6DOF NED/FRD maps yaw and body velocity to the displayed vehicle correctly', () => {
  const options = { ...defaultStateOptions, dof: '6', frame: 'ned', body: 'frd', velocity: 'body' };
  const samples = parseStateVector(`${stateHeader(options)}\n0,0,0,1000,100,0,0,0,0,90,1,2,3\n1,0,0,1000,100,0,0,0,0,90,1,2,3`, options);
  near(samples[0].velocityECEF, [0, 100, 0]);
  near(rotate(samples[0].attitudeECEF, [1, 0, 0]), [0, 1, 0]);
  near(rotate(samples[0].attitudeECEF, [0, 0, 1]), [1, 0, 0]);
  near(samples[0].rates, [Math.PI / 180, 2 * Math.PI / 180, 3 * Math.PI / 180]);
});

test('Euler and normalized quaternion input produce equivalent ECEF attitudes', () => {
  const euler = { ...defaultStateOptions, dof: '6', frame: 'ecef', units: 'radians' };
  const quat = { ...euler, attitude: 'quaternion' };
  const a = parseStateVector(`${stateHeader(euler)}\n0,0,0,1000,0,0,0,0,0,${Math.PI / 2},1,2,3\n1,0,0,1000,0,0,0,0,0,0,1,2,3`, euler);
  const b = parseStateVector(`${stateHeader(quat)}\n0,0,0,1000,0,0,0,0,0,2,2,1,2,3\n1,0,0,1000,0,0,0,0,0,0,1,1,2,3`, quat);
  near(a[0].attitudeECEF, b[0].attitudeECEF);
  near(a[0].rates, [1, 2, 3]);
  near(rotate(a[0].attitudeECEF, [1, 0, 0]), [0, 1, 0]);
});

test('ECEF positions preserve supplied endpoints and interpolate in Cartesian space', () => {
  const options = { ...defaultStateOptions, position: 'ecef', velocity: 'ecef' };
  const samples = parseStateVector(`${stateHeader(options)}\n0,6379137,0,0,0,10,0\n2,6379137,20,0,0,30,0`, options);
  near(samples[0].positionECEF, [6379137, 0, 0]);
  const middle = createFlightPath(samples)(1);
  const point = Cartesian3.fromRadians(middle.longitude, middle.latitude, middle.height);
  near([point.x, point.y, point.z], [6379137, 10, 0]);
  near(interpolateState(samples, 1).velocity, [0, 20, 0]);
  near(interpolateState(samples, -1).velocity, [0, 10, 0]);
  near(interpolateState(samples, 3).velocity, [0, 30, 0]);
});

test('all supported example formats parse and invalid or incomplete state is rejected', () => {
  for (const dof of ['3', '6']) for (const position of ['ecef', 'geodetic']) for (const attitude of ['euler', 'quaternion']) {
    const options = { ...defaultStateOptions, dof, position, attitude };
    assert.equal(parseStateVector(exampleState(options), options).length, 3);
  }
  assert.throws(() => parseStateVector('', { ...defaultStateOptions, velocity: 'body' }), /6DOF/);
  const quat = { ...defaultStateOptions, dof: '6', attitude: 'quaternion' };
  assert.throws(() => parseStateVector(`${stateHeader(quat)}\n0,0,0,1000,0,0,0,0,0,0,0,0,0,0\n1,0,0,1000,0,0,0,0,0,0,1,0,0,0`, quat), /quaternion/);
  assert.throws(() => parseStateVector(`${stateHeader(defaultStateOptions)}\n0,0,0,0,1,2,3\n0,0,0,0,1,2,3`, defaultStateOptions), /increasing/);
  assert.throws(() => parseStateVector(`${stateHeader(quat)}\n0,0,0,1000,0,0,0,0,0,0,1\n1,0,0,1000,0,0,0,0,0,0,1`, quat), /finite numbers/);
});
