import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlight, exampleFlight } from '../src/flight-data.ts';
import { createFlightPath } from '../src/flight-path.ts';

test('position CSV normalizes time and preserves geographic coordinates and optional attitude', () => {
  const data = parseFlight('\uFEFFtime,latitude,longitude,altitude,roll,pitch,yaw\r\n20,50,179,2000,10,20,30\r\n22,51,-179,2500,20,30,40\r\n');
  assert.deepEqual(data[0], { time: 0, latitude: 50, longitude: 179, altitude: 2000, angles: [10, 20, 30] });
  assert.equal(data[1].time, 2);
  assert.equal(data[1].longitude, -179);
  assert.equal(parseFlight(exampleFlight).at(-1).time, 60);
});

test('position CSV rejects bad coordinates, missing data and reversed time', () => {
  for (const row of ['1,91,0,0', '1,0,181,0', '1,0,0,-1', '1,0,0,Infinity', '1,,0,0', '0,0,0,0', '-1,0,0,0', '1,0,0,0,0']) {
    assert.throws(() => parseFlight(`time,latitude,longitude,altitude\n0,0,0,0\n${row}`));
  }
  assert.throws(() => parseFlight('time,latitude,longitude,altitude\n0,0,0,0'));
});

test('globe path crosses the date line and keeps altitude above the ellipsoid', () => {
  const path = createFlightPath(parseFlight('time,latitude,longitude,altitude\n0,0,179,1000\n10,0,-179,3000'));
  const middle = path(5);
  assert.ok(Math.abs(Math.abs(middle.longitude) - Math.PI) < 1e-8);
  assert.ok(Math.abs(middle.latitude) < 1e-8);
  assert.equal(middle.height, 2000);
  assert.equal(path(-1).height, 1000);
  assert.equal(path(12).height, 3000);
});

test('stationary positions support altitude changes; antipodal ambiguity is rejected', () => {
  const path = createFlightPath(parseFlight('time,latitude,longitude,altitude\n0,30,20,0\n2,30,20,1000'));
  assert.ok(Math.abs(path(1).latitude - Math.PI / 6) < 1e-12);
  assert.equal(path(1).height, 500);
  assert.throws(() => createFlightPath(parseFlight('time,latitude,longitude,altitude\n0,0,0,0\n1,0,180,0')), /intermediate/);
});
