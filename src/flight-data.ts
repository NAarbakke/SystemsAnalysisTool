export type Triple = [number, number, number];
export interface FlightSample {
  time: number; latitude: number; longitude: number; altitude: number; angles?: Triple;
  positionECEF?: Triple; velocityECEF?: Triple;
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

export function parseFlight(text: string): FlightSample[] {
  if (text.length > 5_000_000) throw new Error('Use a CSV smaller than 5 MB.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line, i) => ({ line: line.trim(), number: i + 1 })).filter(row => row.line);
  const header = lines.shift()?.line.toLowerCase().replace(/\s/g, '');
  const basic = 'time,latitude,longitude,altitude';
  const hasAngles = header === `${basic},roll,pitch,yaw`;
  if (header !== basic && !hasAngles) throw new Error(`Use header ${basic}, optionally followed by ,roll,pitch,yaw.`);
  if (lines.length < 2 || lines.length > 50000) throw new Error('Use 2–50,000 samples.');
  let previous = -Infinity;
  const samples = lines.map(({ line, number }) => {
    const fields = line.split(',').map(value => value.trim());
    const values = fields.map(Number);
    if (fields.length !== (hasAngles ? 7 : 4) || fields.some(value => !value) || !values.every(Number.isFinite)) throw new Error(`Line ${number}: invalid or missing number.`);
    const [time, latitude, longitude, altitude, ...angles] = values;
    if (time < 0 || time <= previous) throw new Error(`Line ${number}: seconds must be nonnegative and strictly increasing.`);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error(`Line ${number}: latitude must be -90…90 and longitude -180…180.`);
    if (altitude < 0 || altitude > 100_000_000) throw new Error(`Line ${number}: altitude must be 0–100,000,000 metres.`);
    previous = time;
    return { time, latitude, longitude, altitude, ...(hasAngles ? { angles: angles as [number, number, number] } : {}) };
  });
  const start = samples[0].time;
  for (const sample of samples) sample.time -= start;
  return samples;
}
