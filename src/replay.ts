import { Euler, Quaternion, type EulerOrder } from 'three';

export interface AttitudeSample { time: number; rotation: Quaternion }
export const exampleSeries = `time,x,y,z
0,0,0,0
2,20,0,10
4,40,25,20
6,15,45,35
8,-20,20,10
10,0,0,0`;

export function parseSeries(text: string, order: EulerOrder, radians = false): AttitudeSample[] {
  if (!['XYZ', 'YXZ', 'ZXY', 'ZYX', 'YZX', 'XZY'].includes(order)) throw new Error('Invalid Euler order.');
  if (text.length > 5_000_000) throw new Error('Use a CSV smaller than 5 MB.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line, i) => ({ line: line.trim(), number: i + 1 })).filter(({ line }) => line);
  const header = lines.shift()?.line.toLowerCase().replace(/\s/g, '');
  if (!['time,x,y,z', 't,x,y,z', 'time,roll,pitch,yaw'].includes(header ?? '')) {
    throw new Error('Start with the CSV header time,x,y,z (or time,roll,pitch,yaw).');
  }
  if (lines.length < 2) throw new Error('Add at least two timestamped samples.');
  if (lines.length > 50000) throw new Error('Use at most 50,000 samples.');
  let previous = -Infinity;
  const samples = lines.map(({ line, number }) => {
    const fields = line.split(',').map(value => value.trim());
    const values = fields.map(Number);
    if (fields.length !== 4 || fields.some(value => !value) || !values.every(Number.isFinite)) throw new Error(`Line ${number}: enter four finite numbers.`);
    const [time, ...angles] = values;
    if (time < 0 || time <= previous) throw new Error(`Line ${number}: times must be nonnegative and strictly increasing, in seconds.`);
    previous = time;
    const rotation = new Quaternion().setFromEuler(new Euler(...angles.map(value => radians ? value % (2 * Math.PI) : (value % 360) * Math.PI / 180) as [number, number, number], order));
    return { time, rotation };
  });
  const start = samples[0].time;
  for (const sample of samples) sample.time -= start;
  return samples;
}

// Binary search keeps seeking inexpensive even with long simulator exports.
export function sampleOrientation(samples: AttitudeSample[], time: number, output = new Quaternion()): Quaternion {
  if (!samples.length || !Number.isFinite(time)) throw new Error('Invalid replay sample.');
  if (time <= 0) return output.copy(samples[0].rotation);
  const last = samples.length - 1;
  if (time >= samples[last].time) return output.copy(samples[last].rotation);
  let low = 0, high = last;
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (samples[mid].time <= time) low = mid;
    else high = mid;
  }
  return output.slerpQuaternions(samples[low].rotation, samples[high].rotation,
    (time - samples[low].time) / (samples[high].time - samples[low].time));
}
