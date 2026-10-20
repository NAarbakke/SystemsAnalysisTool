import { Cartesian3, Matrix3, Matrix4, Quaternion, Transforms } from 'cesium';
import { Euler, Quaternion as ThreeQuaternion } from 'three';

export type ReferenceFrame = 'ecef' | 'enu' | 'ned';

/** Body-to-reference rotation from four finite components (x, y, z, w), at any scale. */
export function fromQuaternion(values: number[]): ThreeQuaternion {
  if (values.length !== 4 || !values.every(Number.isFinite)) throw new Error('Enter four finite quaternion components.');
  const scale = Math.max(...values.map(Math.abs));
  if (scale === 0) throw new Error('A quaternion cannot have all four components equal to zero.');
  return new ThreeQuaternion(...values.map(v => v / scale) as [number, number, number, number]).normalize();
}

/** Body-to-reference rotation from roll, pitch and yaw, applied yaw first (intrinsic ZYX). */
export function fromEuler(angles: number[], units: 'degrees' | 'radians' = 'degrees'): ThreeQuaternion {
  const [roll, pitch, yaw] = angles.map(value => units === 'degrees' ? (value % 360) * Math.PI / 180 : value % (2 * Math.PI));
  return new ThreeQuaternion().setFromEuler(new Euler(roll, pitch, yaw, 'ZYX'));
}

/** Axes of a reference frame at `position`, expressed in ECEF. */
export function frameMatrix(position: Cartesian3, frame: ReferenceFrame): Matrix3 {
  if (frame === 'ecef') return Matrix3.clone(Matrix3.IDENTITY);
  const enu = Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(position), new Matrix3());
  if (frame === 'enu') return enu;
  // NED -> ENU: (north,east,down) -> (east,north,-down).
  return Matrix3.multiply(enu, new Matrix3(0, 1, 0, 1, 0, 0, 0, 0, -1), new Matrix3());
}

/** A body-to-reference rotation re-expressed as body-to-ECEF at `position`. */
export function toECEF(position: Cartesian3, local: ThreeQuaternion, frame: ReferenceFrame): Quaternion {
  const reference = Quaternion.fromRotationMatrix(frameMatrix(position, frame));
  return Quaternion.multiply(reference, new Quaternion(local.x, local.y, local.z, local.w), new Quaternion());
}
