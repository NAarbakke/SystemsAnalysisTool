import { Cartesian3, Cartographic, Matrix3, Quaternion } from 'cesium';
import type { Quaternion as ThreeQuaternion } from 'three';
import { frameMatrix, fromEuler, fromQuaternion, toECEF } from './attitude.ts';
import { bracket } from '../../../core/series.ts';
import { parseTimedCsv } from '../../../core/timed-csv.ts';
import type { FlightSample, Triple } from './data.ts';

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

export function parseStateVector(text: string, options: StateOptions): FlightSample[] {
  if (!['3', '6'].includes(options.dof) || !['geodetic', 'ecef'].includes(options.position)
    || !['ecef', 'enu', 'ned', 'body'].includes(options.velocity)
    || !['euler', 'quaternion'].includes(options.attitude) || !['ecef', 'enu', 'ned'].includes(options.frame)
    || !['degrees', 'radians'].includes(options.units) || !['flu', 'frd'].includes(options.body)) throw new Error('Invalid state format selection.');
  if (options.dof === '3' && options.velocity === 'body') throw new Error('Body-axis velocity requires 6DOF attitude. Select ECEF, ENU, or NED for 3DOF.');
  const header = stateHeader(options);
  return parseTimedCsv(text, line => line === header ? header.split(',').length : undefined, `Expected header: ${header}`, (values, fail) => {
    const [time, a, b, c, vx, vy, vz] = values;
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
      } else local = fromEuler(values.slice(7, 10), options.units);
      sourceAttitude = toECEF(position, local, options.frame);
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
}

export function interpolateState(samples: FlightSample[], seconds: number) {
  const { low, high, fraction: t } = bracket(samples.length, i => samples[i].time, seconds);
  const a = samples[low], b = samples[high];
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
