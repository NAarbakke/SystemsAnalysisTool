import { Euler, Quaternion } from 'three';

// Absolute model-to-world rotation; intrinsic XYZ Euler angles in degrees.
export function fromEulerDegrees(values: number[]): Quaternion {
  if (values.length !== 3 || !values.every(Number.isFinite)) throw new Error('Enter three finite angles.');
  return new Quaternion().setFromEuler(new Euler(...values.map(v => (v % 360) * Math.PI / 180) as [number, number, number], 'XYZ'));
}

export function fromQuaternion(values: number[]): Quaternion {
  if (values.length !== 4 || !values.every(Number.isFinite)) throw new Error('Enter four finite quaternion components.');
  const scale = Math.max(...values.map(Math.abs));
  if (scale === 0) throw new Error('A quaternion cannot have all four components equal to zero.');
  return new Quaternion(...values.map(v => v / scale) as [number, number, number, number]).normalize();
}

export function toEulerDegrees(rotation: Quaternion): number[] {
  const euler = new Euler().setFromQuaternion(rotation, 'XYZ');
  return [euler.x, euler.y, euler.z].map(v => v * 180 / Math.PI);
}
