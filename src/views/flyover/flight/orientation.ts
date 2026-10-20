import {
  CallbackProperty, Cartesian3, JulianDate, Matrix3, Matrix4, Quaternion, SampledProperty, Transforms,
  VelocityOrientationProperty, type PositionProperty,
} from 'cesium';
import type { FlightSample } from './data.ts';
import { interpolateState } from './state-vector.ts';

const localFrame = (origin: Cartesian3, result?: Quaternion) =>
  Quaternion.fromRotationMatrix(Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(origin), new Matrix3()), result);

/**
 * How the vehicle faces through the replay: the supplied attitude when the data has one;
 * otherwise along the supplied velocity, or along the route when only positions are given.
 * Where there is no direction to face (stationary samples), it sits level in the local frame.
 */
export function vehicleOrientation(samples: FlightSample[], start: JulianDate, duration: number, position: PositionProperty) {
  if (samples[0].attitudeECEF) {
    const sampled = new SampledProperty(Quaternion);
    for (const sample of samples) sampled.addSample(JulianDate.addSeconds(start, sample.time, new JulianDate()), new Quaternion(...sample.attitudeECEF!));
    return sampled;
  }
  if (samples[0].velocityECEF) {
    return new CallbackProperty((time, result) => {
      const origin = position.getValue(time!)!;
      const vector = new Cartesian3(...interpolateState(samples, JulianDate.secondsDifference(time!, start)).velocity!);
      if (Cartesian3.magnitude(vector) <= 1e-9) return localFrame(origin, result);
      return Quaternion.fromRotationMatrix(Transforms.rotationMatrixFromPositionVelocity(origin, Cartesian3.normalize(vector, vector)), result);
    }, false);
  }
  const travel = new VelocityOrientationProperty(position);
  return new CallbackProperty((time, result) => {
    // The direction of travel needs a step ahead, so the last instant borrows the one just before it.
    const seconds = Math.max(0, Math.min(duration - Math.min(0.02, duration / 2), JulianDate.secondsDifference(time!, start)));
    return travel.getValue(JulianDate.addSeconds(start, seconds, new JulianDate()), result) ?? localFrame(position.getValue(time!)!, result);
  }, false);
}
