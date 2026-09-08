import { Cartesian3, Cartographic, Matrix3, Matrix4, Quaternion, Transforms } from 'cesium';
import { Euler, Quaternion as ThreeQuaternion } from 'three';
import { fromQuaternion } from './orientation.ts';
import type { FlightSample, Triple } from './flight-data.ts';

export interface StateOptions {
  dof: '3' | '6'; position: 'geodetic' | 'ecef';
  velocity: 'ecef' | 'enu' | 'ned' | 'body';
  attitude: 'euler' | 'quaternion'; frame: 'ecef' | 'enu' | 'ned';
  units: 'degrees' | 'radians'; body: 'flu' | 'frd';
}
export const defaultStateOptions: StateOptions = {
  dof: '3', position: 'geodetic', velocity: 'enu', attitude: 'euler',
  frame: 'enu', units: 'degrees', body: 'flu',
};

export function stateHeader(options: StateOptions): string {
  const position = options.position === 'geodetic' ? 'latitude,longitude,altitude' : 'x,y,z';
  const attitude = options.attitude === 'euler' ? 'roll,pitch,yaw' : 'qx,qy,qz,qw';
  return `time,${position},vx,vy,vz${options.dof === '6' ? `,${attitude},p,q,r` : ''}`;
}

function frameMatrix(position: Cartesian3, frame: 'ecef' | 'enu' | 'ned'): Matrix3 {
  if (frame === 'ecef') return Matrix3.clone(Matrix3.IDENTITY);
  const enu = Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(position), new Matrix3());
  if (frame === 'enu') return enu;
  // NED -> ENU: (north,east,down) -> (east,north,-down).
  return Matrix3.multiply(enu, new Matrix3(0, 1, 0, 1, 0, 0, 0, 0, -1), new Matrix3());
}

export function parseStateVector(text: string, options: StateOptions): FlightSample[] {
  if (!['3', '6'].includes(options.dof) || !['geodetic', 'ecef'].includes(options.position)
    || !['ecef', 'enu', 'ned', 'body'].includes(options.velocity)
    || !['euler', 'quaternion'].includes(options.attitude) || !['ecef', 'enu', 'ned'].includes(options.frame)
    || !['degrees', 'radians'].includes(options.units) || !['flu', 'frd'].includes(options.body)) throw new Error('Invalid state format selection.');
  if (options.dof === '3' && options.velocity === 'body') throw new Error('Body-axis velocity requires 6DOF attitude. Select ECEF, ENU, or NED for 3DOF.');
  if (text.length > 5_000_000) throw new Error('Use a CSV smaller than 5 MB.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line, i) => ({ line: line.trim(), number: i + 1 })).filter(row => row.line);
  const header = stateHeader(options);
  if (lines.shift()?.line.toLowerCase().replace(/\s/g, '') !== header) throw new Error(`Expected header: ${header}`);
  if (lines.length < 2 || lines.length > 50000) throw new Error('Use 2–50,000 samples.');
  const columns = header.split(',').length;
  let previous = -Infinity;
  const samples = lines.map(({ line, number }) => {
    const fields = line.split(',').map(value => value.trim());
    const values = fields.map(Number);
    const fail = (message: string): never => { throw new Error(`Line ${number}: ${message}`); };
    if (fields.length !== columns || fields.some(value => !value) || !values.every(Number.isFinite)) fail(`enter ${columns} finite numbers.`);
    const [time, a, b, c, vx, vy, vz] = values;
    if (time < 0 || time <= previous) fail('time must be nonnegative, strictly increasing seconds.');
    previous = time;
    let position: Cartesian3;
    if (options.position === 'geodetic') {
      if (Math.abs(a) > 90 || Math.abs(b) > 180 || c < -10000 || c > 100_000_000) fail('invalid latitude, longitude, or ellipsoid altitude (-10 km to 100,000 km).');
      position = Cartesian3.fromDegrees(b, a, c);
    } else {
      position = new Cartesian3(a, b, c);
      const radius = Cartesian3.magnitude(position);
      if (!Number.isFinite(radius) || radius < 6_000_000 || radius > 110_000_000) fail('ECEF position must be in metres, near or above Earth (radius 6,000–110,000 km).');
    }
    const geo = Cartographic.fromCartesian(position);
    let sourceAttitude: Quaternion | undefined;
    let modelAttitude: Quaternion | undefined;
    let rates: Triple | undefined;
    if (options.dof === '6') {
      let local: ThreeQuaternion;
      if (options.attitude === 'quaternion') {
        try { local = fromQuaternion(values.slice(7, 11)); }
        catch { return fail('quaternion must be finite and nonzero (x,y,z,w, body-to-reference).'); }
      } else {
        const radians = values.slice(7, 10).map(value => options.units === 'degrees' ? (value % 360) * Math.PI / 180 : value % (2 * Math.PI));
        local = new ThreeQuaternion().setFromEuler(new Euler(...radians as Triple, 'ZYX'));
      }
      const frame = Quaternion.fromRotationMatrix(frameMatrix(position, options.frame));
      sourceAttitude = Quaternion.multiply(frame, new Quaternion(local.x, local.y, local.z, local.w), new Quaternion());
      // Display models use forward/left/up. FRD body coordinates require a half-turn about X.
      modelAttitude = options.body === 'frd'
        ? Quaternion.multiply(sourceAttitude, new Quaternion(1, 0, 0, 0), new Quaternion()) : sourceAttitude;
      const offset = options.attitude === 'quaternion' ? 11 : 10;
      rates = values.slice(offset, offset + 3).map(value => options.units === 'degrees' ? value * Math.PI / 180 : value) as Triple;
      if (!rates.every(Number.isFinite)) fail('angular rates are too large.');
    }
    const velocityFrame = options.velocity === 'body'
      ? Matrix3.fromQuaternion(sourceAttitude!) : frameMatrix(position, options.velocity);
    const velocity = Matrix3.multiplyByVector(velocityFrame, new Cartesian3(vx, vy, vz), new Cartesian3());
    if (![velocity.x, velocity.y, velocity.z, Cartesian3.magnitude(velocity)].every(Number.isFinite)) fail('velocity is too large.');
    return {
      time, latitude: geo.latitude * 180 / Math.PI, longitude: geo.longitude * 180 / Math.PI, altitude: geo.height,
      ...(options.position === 'ecef' ? { positionECEF: [a, b, c] as Triple } : {}),
      velocityECEF: [velocity.x, velocity.y, velocity.z] as Triple,
      ...(modelAttitude ? { attitudeECEF: [modelAttitude.x, modelAttitude.y, modelAttitude.z, modelAttitude.w] as [number, number, number, number], rates } : {}),
    };
  });
  const start = samples[0].time;
  for (const sample of samples) sample.time -= start;
  return samples;
}

export function interpolateState(samples: FlightSample[], seconds: number) {
  let low = 0, high = samples.length - 1;
  while (high - low > 1) { const mid = (low + high) >>> 1; if (samples[mid].time <= seconds) low = mid; else high = mid; }
  const a = samples[low], b = samples[high];
  const t = Math.max(0, Math.min(1, (seconds - a.time) / (b.time - a.time)));
  const blend = (x?: Triple, y?: Triple): Triple | undefined => x && y ? x.map((value, i) => value * (1 - t) + y[i] * t) as Triple : undefined;
  return { velocity: blend(a.velocityECEF, b.velocityECEF), rates: blend(a.rates, b.rates) };
}

export function exampleState(options: StateOptions): string {
  const rows = [0, 5, 10].map((time, index) => {
    const position = Cartesian3.fromDegrees(10 + index, 45, 100000);
    const coordinates = options.position === 'geodetic' ? [45, 10 + index, 100000] : [position.x, position.y, position.z];
    const angle = index * Math.PI / 6;
    const attitude = options.attitude === 'euler' ? [0, 0, options.units === 'degrees' ? angle * 180 / Math.PI : angle]
      : [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)];
    return [time, ...coordinates, 100, 0, 0, ...(options.dof === '6' ? [...attitude, 0, 0, options.units === 'degrees' ? 6 : Math.PI / 30] : [])].join(',');
  });
  return [stateHeader(options), ...rows].join('\n');
}
