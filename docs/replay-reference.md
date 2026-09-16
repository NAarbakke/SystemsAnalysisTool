# Replay and coordinate reference

[Back to the user guide](../README.md)

Detailed CSV formats, units and coordinate conventions. File paths below are relative to the project root.

## Legacy Assembly orientation and separation

**UI availability:** The current Assembly screen exposes orbit, zoom, component selection and separation. The manual orientation and orientation replay controls described below are not currently exposed. These sections retain the conventions for the existing orientation/replay modules; use Flyover for the flight import controls available today.

Choose Euler angles (degrees, intrinsic XYZ order) or quaternion components in x, y, z, w order, enter values, and click Apply orientation. Inputs specify an absolute model-to-world rotation in the right-handed, Y-up scene. Quaternions are normalized; the zero quaternion is rejected. Switching format converts the applied pose; unapplied edits are discarded. Equivalent Euler angles can differ, especially at gimbal lock. Reset restores the identity rotation.

The existing model axes are retained: SS-27 and spindle run along Y; Burevestnik runs along X. These are model coordinates, not an aerospace body/NED frame. Dragging changes only the camera. Changing models resets orientation and separation.

The separation slider runs from 0% (assembled) to 100% (fully exploded). It works at any orientation and can interrupt the button animation. Camera fitting accounts for rotated parts at both separation endpoints.

WebGPU is not required. This viewer uses Three.js WebGLRenderer and needs WebGL 2. All rendering stays in the browser.

## Legacy Assembly orientation replay

Open **Orientation replay** below the manual orientation controls. Paste CSV or open a local CSV file, choose its angle units and intrinsic Euler order, then click **Load series**. **Use example** loads a ten-second demonstration. Play/Pause, Restart, and the Replay time slider control playback. Separation remains independent.

```csv
time,x,y,z
0,0,0,0
2,20,0,10
4,40,25,20
```

The header must be `time,x,y,z`, `t,x,y,z`, or `time,roll,pitch,yaw`. Roll, pitch, yaw mean rotations about X, Y, Z respectively; their composition uses the selected intrinsic order (e.g. ZYX). Timestamps are seconds, nonnegative and strictly increasing; the first timestamp becomes replay time zero. Choose degrees or radians before loading. Blank lines are accepted; at least two samples are required. The limit is 50,000 samples / 5 MB. Files stay in browser memory and are never uploaded or saved automatically.

Convert the simulator's coordinate frame into the model's right-handed Y-up scene before importing. Selecting ZYX alone does not convert NED/ENU frames or align a model's longitudinal axis. The replay shows orientation only, without trajectory, forces, or flight simulation.

Interpolation uses shortest-path quaternion SLERP between samples, avoiding angle-wrap jumps. Supply sufficiently frequent samples: rotations exceeding 180 degrees between samples and full-turn counts cannot be recovered. Playback follows timestamp spacing at 1x speed, stops at the final sample, and pauses when the tab is hidden. Manual orientation edits pause playback. Model changes reset playback time and the model pose while retaining the loaded data; Play or seek applies it to the new model. Editing CSV or units/order requires Load series again. Invalid input leaves the previous series loaded and paused.

The camera initially fits all possible rotations and separation levels; you can still orbit or zoom during playback. Example CSV: `models/examples/orientation.csv`. Implementation: `src/replay.ts` (validation/interpolation), `src/replay-controls.ts` (playback controls).
## Flyover position replay

Use the top menu to switch between the existing Assembly tools and the CesiumJS Flyover globe. Assembly retains its pose/separation when you return. Switching views pauses playback and disables rendering in the hidden view. The globe code loads only on the first visit to Flyover.

Flyover includes an illustrative 60-second route, the same three locally generated models, Play/Pause, Restart, a time slider, Whole route, and Follow vehicle. The vehicle is enlarged for legibility. The example does not represent real flight dynamics, speeds, or a predicted trajectory. The complete route is shown as a cyan line.

Under Load a flight, paste CSV or open a local file, then click Load flight:

```csv
time,latitude,longitude,altitude
0,35,-35,120000
10,39,-28,140000
20,43,-20,160000
```

Time is seconds and becomes relative to the first sample. Latitude/longitude are decimal degrees. Altitude is metres above the WGS84 ellipsoid (not mean sea level or ground). Times must increase strictly. Between samples, geographic position follows the shortest ellipsoidal geodesic and altitude interpolates linearly; this avoids Cartesian chords through Earth and handles the date line. Add intermediate points for nearly antipodal segments. Limits: 2–50,000 samples, 5 MB, nonnegative altitude up to 100,000 km. All data stays in browser memory.

Without attitude columns, the vehicle faces along the route; stationary sections use a local East/North/Up orientation. Optional columns `roll,pitch,yaw` follow altitude and specify intrinsic ZYX Euler degrees relative to the local ENU frame. This uses the flyover vehicle frame (+X forward, +Z up); the Three.js model axes are aligned during in-memory glTF export. Simulator NED/body-frame data must be converted before import. Unlike the assembly replay, this import has a fixed convention. Supplied orientation samples are interpolated as rotations in Earth-fixed coordinates. Timestamped positions and attitudes must be in the same CSV.

The basemap is NASA Blue Marble Next Generation, tiled locally up to 16384 x 8192 global resolution. It uses July 2004 satellite-derived imagery and is not a live map or street-level imagery. Terrain is a smooth WGS84 ellipsoid; shaded relief in the image is not a 3D elevation model. No ion token, geocoder, external tile server, or cloud service is used. The Cesium attribution link does not indicate a cloud connection. Detailed imagery/terrain could later be supplied by a licensed intranet map server.

`npm run build` and `npm run dev` prepare Cesium's local Assets, Workers, ThirdParty, and Widgets in `static/cesium/`; Vite copies these into dist. The complete dist directory must be deployed. Cesium and third-party license metadata are included under dist/cesium. Sources: https://github.com/CesiumGS/cesium/blob/main/Documentation/OfflineGuide/README.md and https://www.naturalearthdata.com/about/terms-of-use/ .

Example data is in `models/examples/flight.csv`. Flyover UI/rendering: `src/flyover.ts`; CSV parsing: `src/flight-data.ts`; geographic interpolation: `src/flight-path.ts`.
## Full 3DOF / 6DOF state replay

In **Flyover > Load a flight**, select **Input type: 3DOF** or **6DOF**. Select the input conventions, paste/open CSV with the displayed header, and click **Load flight**. The **Example** button generates a sample matching the selected format. Existing position-only CSV remains supported through **Position series**.

| State | Required data after time |
| --- | --- |
| 3DOF | Position (3) and velocity (3) |
| 6DOF, Euler | Position (3), velocity (3), roll/pitch/yaw (3), body rates p/q/r (3) |
| 6DOF, quaternion | Position (3), velocity (3), qx/qy/qz/qw (4), body rates p/q/r (3) |

Geodetic 3DOF header: `time,latitude,longitude,altitude,vx,vy,vz`.
Geodetic Euler 6DOF header: `time,latitude,longitude,altitude,vx,vy,vz,roll,pitch,yaw,p,q,r`.
Geodetic quaternion 6DOF header: `time,latitude,longitude,altitude,vx,vy,vz,qx,qy,qz,qw,p,q,r`.
For ECEF positions, replace `latitude,longitude,altitude` with `x,y,z`. Headers are required in this order. 3DOF does not require attitude or rates; 6DOF requires all of them.

- Time: seconds, normalized to the first timestamp. Strictly increasing, finite, nonnegative timestamps; 2–50,000 rows, 5 MB maximum.
- Position: either geodetic latitude/longitude in degrees with metres above the WGS84 ellipsoid, or ECEF Cartesian X/Y/Z in metres. ECEF is Earth-centred and Earth-fixed, not an arbitrary simulator origin. Local Cartesian positions and ECI positions must be converted before import. Geodetic altitude accepts -10 km to 100,000 km; ECEF radius accepts 6,000–110,000 km.
- Velocity: metres per second, Earth-relative, expressed in the selected ECEF, local ENU, local NED, or body frame. Body-frame velocity requires 6DOF attitude. These are not inertial velocities or air-relative velocities. The importer rotates the supplied vectors into ECEF; it does not add Earth rotation or wind corrections.
- Attitude: active body-to-reference rotation. Choose ECEF, local ENU, or local NED as the reference, and Forward/Left/Up (FLU) or Forward/Right/Down (FRD) as the source body axes. Euler angles use intrinsic ZYX composition and the selected degrees/radians. Quaternion input uses Hamilton x,y,z,w, is normalized, and must be nonzero. Reference-to-body quaternions must be inverted before import.
- Rates: p,q,r are angular velocity components about the selected source body X,Y,Z axes, not Euler-angle derivatives. Units are degrees/second or radians/second according to the units selector. Rates are retained and displayed in the original body convention.

Imported attitudes drive 6DOF vehicle orientation directly. 3DOF uses the supplied velocity direction to orient the vehicle for display; roll is unspecified, and a zero velocity uses the local ENU orientation. Geodetic positions use the existing ellipsoidal interpolation; ECEF positions interpolate linearly in Cartesian space. Attitude uses quaternion interpolation in ECEF. Velocities and body rates interpolate linearly for the state readout. Position, velocity, attitude and rates are independently replayed observations: velocities/rates are not integrated into a new trajectory, and the viewer does not impose dynamic consistency. Use dense simulator output if precise between-sample motion matters. Sparse ECEF samples can interpolate below Earth's surface.

Expand **State vector readout** to inspect ECEF position/velocity, speed, the displayed FLU-body-to-ECEF quaternion, and source-body p/q/r. Editing format choices pauses replay and only applies to the next successful Load flight. Invalid data leaves the previous series paused and available.

Examples and their exact settings are documented in `models/examples/README.md`. All state data remains local and is cleared when the page reloads.

