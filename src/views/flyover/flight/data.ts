import { Cartesian3 } from 'cesium';
import { fromEuler, toECEF } from './attitude.ts';
import { parseTimedCsv } from '../../../core/timed-csv.ts';

export type Triple = [number, number, number];
export interface FlightSample {
  time: number; latitude: number; longitude: number; altitude: number;
  positionECEF?: Triple; velocityECEF?: Triple;
  /** Body (forward/left/up) to ECEF, as x, y, z, w. */
  attitudeECEF?: [number, number, number, number]; rates?: Triple;
}
export const exampleFlight = `time,latitude,longitude,altitude
0,35,-35,120000
10,39,-28,140000
20,43,-20,160000
30,46,-11,180000
40,48,-1,160000
50,49,9,140000
60,48,19,120000`;

const BASIC = 'time,latitude,longitude,altitude';

/** Position series in degrees and metres, optionally with roll, pitch and yaw in degrees against local east/north/up. */
export function parseFlight(text: string): FlightSample[] {
  return parseTimedCsv(text,
    header => header === BASIC ? 4 : header === `${BASIC},roll,pitch,yaw` ? 7 : undefined,
    `Use header ${BASIC}, optionally followed by ,roll,pitch,yaw.`,
    ([time, latitude, longitude, altitude, ...angles], fail) => {
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) fail('latitude must be -90…90 and longitude -180…180.');
      if (altitude < 0 || altitude > 100_000_000) fail('altitude must be 0–100,000,000 metres.');
      if (!angles.length) return { time, latitude, longitude, altitude };
      const attitude = toECEF(Cartesian3.fromDegrees(longitude, latitude, altitude), fromEuler(angles), 'enu');
      return { time, latitude, longitude, altitude, attitudeECEF: [attitude.x, attitude.y, attitude.z, attitude.w] };
    });
}
