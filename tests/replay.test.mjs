import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { parseSeries, sampleOrientation, exampleSeries } from '../src/replay.ts';

test('CSV normalizes timestamps and reproduces samples and interval boundaries', () => {
  const samples = parseSeries('\uFEFFtime,x,y,z\r\n10,0,0,0\r\n12,90,0,0\r\n15,180,0,0\r\n', 'XYZ');
  assert.deepEqual(samples.map(s => s.time), [0, 2, 5]);
  assert.ok(sampleOrientation(samples, -1).equals(samples[0].rotation));
  assert.ok(sampleOrientation(samples, 50).equals(samples[2].rotation));
  assert.ok(sampleOrientation(samples, 2).angleTo(samples[1].rotation) < 1e-7);
  const mid = new Vector3(0, 1, 0).applyQuaternion(sampleOrientation(samples, 1));
  assert.ok(mid.distanceTo(new Vector3(0, Math.SQRT1_2, Math.SQRT1_2)) < 1e-12);
});

test('interpolation crosses the angle wrap by the short path', () => {
  const samples = parseSeries('time,x,y,z\n0,0,0,179\n2,0,0,-179', 'XYZ');
  const mid = new Vector3(1, 0, 0).applyQuaternion(sampleOrientation(samples, 1));
  assert.ok(mid.distanceTo(new Vector3(-1, 0, 0)) < 1e-12);
});

test('radians and ZYX roll/pitch/yaw exports obey their declared convention', () => {
  const samples = parseSeries(`time,roll,pitch,yaw\n0,${Math.PI / 2},${Math.PI / 2},0\n1,0,0,0`, 'ZYX', true);
  // Rz * Ry * Rx: Y first rotates to Z, then to X.
  assert.ok(new Vector3(0, 1, 0).applyQuaternion(samples[0].rotation).distanceTo(new Vector3(1, 0, 0)) < 1e-12);
  assert.equal(parseSeries(exampleSeries, 'XYZ').at(-1).time, 10);
});

test('malformed data fails with actionable errors', () => {
  for (const text of [
    'time,x,y,z\n0,0,0,0',
    'time,x,y,z\n0,0,0,0\n0,1,2,3',
    'time,x,y,z\n2,0,0,0\n1,1,2,3',
    'time,x,y,z\n-1,0,0,0\n1,1,2,3',
    'time,x,y,z\n0,0,0,0\n1,,2,3',
    'time,x,y,z\n0,0,0,0\n1,NaN,2,3',
    'time,x,y,z\n0,0,0,0\n1,Infinity,2,3',
    'time,x,y,z\n0,0,0,0\n1,1,2,3,4',
    'wrong,header\n0,0,0,0\n1,1,2,3',
  ]) assert.throws(() => parseSeries(text, 'XYZ'));
});
