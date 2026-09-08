import { Cartesian3, Cartographic, EllipsoidGeodesic } from 'cesium';
import type { FlightSample } from './flight-data.ts';

export function createFlightPath(samples: FlightSample[]) {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const normalA = Cartesian3.normalize(Cartesian3.fromDegrees(a.longitude, a.latitude), new Cartesian3());
    const normalB = Cartesian3.normalize(Cartesian3.fromDegrees(b.longitude, b.latitude), new Cartesian3());
    if (Cartesian3.dot(normalA, normalB) < -0.999) throw new Error('Add intermediate samples between nearly opposite points on Earth.');
  }
  let activeSegment = -1;
  let geodesic: EllipsoidGeodesic;
  return (seconds: number) => {
    let low = 0, high = samples.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >>> 1;
      if (samples[mid].time <= seconds) low = mid; else high = mid;
    }
    const a = samples[low], b = samples[high];
    const t = Math.max(0, Math.min(1, (seconds - a.time) / (b.time - a.time)));
    if (a.positionECEF && b.positionECEF) {
      return Cartographic.fromCartesian(Cartesian3.lerp(new Cartesian3(...a.positionECEF), new Cartesian3(...b.positionECEF), t, new Cartesian3()));
    }
    if (activeSegment !== low) {
      activeSegment = low;
      geodesic = new EllipsoidGeodesic(Cartographic.fromDegrees(a.longitude, a.latitude), Cartographic.fromDegrees(b.longitude, b.latitude));
    }
    const position = geodesic!.surfaceDistance < 0.001
      ? Cartographic.fromDegrees(a.longitude, a.latitude) : geodesic!.interpolateUsingFraction(t);
    position.height = a.altitude + (b.altitude - a.altitude) * t;
    return position;
  };
}
