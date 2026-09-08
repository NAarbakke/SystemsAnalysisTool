import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Viewer, ImageryLayer, UrlTemplateImageryProvider, GeographicTilingScheme, EllipsoidTerrainProvider,
  Cartesian3, JulianDate, ClockRange, ClockStep, Color, HeadingPitchRange,
  CallbackPositionProperty, CallbackProperty, VelocityOrientationProperty, SampledProperty, Quaternion,
  Transforms, Matrix3, Matrix4, BoundingSphere, ModelGraphics, Cartesian2, Ion,
} from 'cesium';
import { Euler, Quaternion as ThreeQuaternion } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { models } from '../models/index.ts';
import { exampleFlight, parseFlight, type FlightSample } from './flight-data.ts';
import { createFlightPath } from './flight-path.ts';
import { parseStateVector, stateHeader, exampleState, interpolateState, type StateOptions } from './state-vector.ts';
import { addNotamLayer } from './notam-layer.ts';

export async function createFlyover() {
  const message = document.querySelector<HTMLElement>('#flight-message')!;
  message.textContent = 'Loading local Earth map…';
  Ion.defaultAccessToken = '';
  const imagery = new UrlTemplateImageryProvider({
    url: new URL('./earth/{z}/{x}/{y}.jpg', document.baseURI).href.replaceAll('%7B', '{').replaceAll('%7D', '}'),
    tilingScheme: new GeographicTilingScheme(), maximumLevel: 5,
    credit: 'NASA Blue Marble Next Generation · July 2004',
  });
  const viewer = new Viewer('globe', {
    baseLayer: new ImageryLayer(imagery), terrainProvider: new EllipsoidTerrainProvider(),
    baseLayerPicker: false, geocoder: false, animation: false, timeline: false,
    homeButton: false, sceneModePicker: false, navigationHelpButton: false,
    fullscreenButton: false, infoBox: false, selectionIndicator: false,
    requestRenderMode: true, maximumRenderTimeChange: Infinity,
    shouldAnimate: false,
    useBrowserRecommendedResolution: false,
    msaaSamples: 4,
  });
  viewer.resolutionScale = Math.min(1, 2 / devicePixelRatio);
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.skyAtmosphere!.show = true;
  const play = document.querySelector<HTMLButtonElement>('#flight-play')!;
  const seek = document.querySelector<HTMLInputElement>('#flight-time')!;
  const readout = document.querySelector<HTMLOutputElement>('#flight-time-value')!;
  const positionText = document.querySelector<HTMLElement>('#flight-position')!;
  const csv = document.querySelector<HTMLTextAreaElement>('#flight-csv')!;
  const picker = document.querySelector<HTMLSelectElement>('#flyover-model')!;
  const follow = document.querySelector<HTMLButtonElement>('#flight-follow')!;
  const dof = document.querySelector<HTMLSelectElement>('#flight-dof')!;
  const stateFields = Object.fromEntries(['position', 'velocity', 'attitude', 'frame', 'units', 'body'].map(key => [key, document.querySelector<HTMLSelectElement>(`#state-${key}`)!]));
  const stateReadout = document.querySelector<HTMLElement>('#flight-state')!;
  let loadedOptions: StateOptions | undefined;
  function stateOptions(): StateOptions {
    return { dof: dof.value, ...Object.fromEntries(Object.entries(stateFields).map(([key, input]) => [key, input.value])) } as StateOptions;
  }
  function describeFormat() {
    pause();
    document.querySelector<HTMLElement>('#state-options')!.hidden = dof.value === 'trajectory';
    document.querySelector<HTMLElement>('#attitude-options')!.hidden = dof.value !== '6';
    stateFields.velocity.querySelector<HTMLOptionElement>('option[value="body"]')!.disabled = dof.value !== '6';
    if (dof.value !== '6' && stateFields.velocity.value === 'body') stateFields.velocity.value = 'enu';
    document.querySelector('#flight-header')!.textContent = dof.value === 'trajectory' ? 'time,latitude,longitude,altitude' : stateHeader(stateOptions());
    document.querySelector('#flight-attitude-help')!.textContent = dof.value === 'trajectory'
      ? 'Position series may include roll,pitch,yaw (ZYX degrees in ENU). Without attitude, the vehicle faces along the route.'
      : dof.value === '3' ? 'Velocity is Earth-relative. The model faces along the supplied velocity; roll is unspecified.'
      : 'Attitude rotates body coordinates into the selected reference frame. Quaternion order: x,y,z,w (normalized on load). p,q,r are body-axis angular rates. Rates are displayed, not integrated.';
    document.querySelector('#flight-format-help')!.textContent = 'Time: seconds. Position: metres or latitude/longitude degrees and ellipsoid altitude metres. Velocity: m/s, Earth-relative. Match the header below.';
    message.textContent = 'Format changed. Load flight to apply it, or Example for this format. The previous replay is paused.';
  }
  [dof, ...Object.values(stateFields)].forEach(input => input.addEventListener('change', describeFormat));
  models.forEach(model => picker.add(new Option(model.title, model.id)));
  let samples: FlightSample[] = [];
  let duration = 0;
  let start = JulianDate.fromIso8601('2026-01-01T00:00:00Z');
  let vehicle: ReturnType<typeof viewer.entities.add> | undefined;
  let routePositions: Cartesian3[] = [];
  let modelURL: string | undefined;
  let revision = 0;
  let visible = true;
  let following = false;
  let disposed = false;
  let geographicAt: ReturnType<typeof createFlightPath>;

  function pause() { viewer.clock.shouldAnimate = false; play.textContent = 'Play'; }
  function currentSeconds() { return Math.max(0, Math.min(duration, JulianDate.secondsDifference(viewer.clock.currentTime, start))); }
  function updateReadout() {
    if (!samples.length) return;
    const time = currentSeconds();
    seek.value = String(time);
    readout.value = `${time.toFixed(1)} / ${duration.toFixed(1)} s`;
    const geo = geographicAt(time);
    const state = interpolateState(samples, time);
    document.querySelector<HTMLElement>('#state-readout')!.hidden = !state.velocity;
    stateReadout.textContent = '';
    if (state.velocity) {
      const ecef = Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height);
      const speed = Math.hypot(...state.velocity);
      stateReadout.textContent = `${loadedOptions?.dof}DOF · speed ${speed.toFixed(2)} m/s\nECEF position: ${[ecef.x, ecef.y, ecef.z].map(v => v.toFixed(2)).join(', ')} m\nECEF velocity: ${state.velocity.map(v => v.toFixed(2)).join(', ')} m/s`;
      if (loadedOptions?.dof === '6') {
        const attitude = vehicle?.orientation?.getValue(viewer.clock.currentTime);
        if (attitude) stateReadout.textContent += `\nQuaternion (FLU body → ECEF; x,y,z,w): ${[attitude.x, attitude.y, attitude.z, attitude.w].map(v => v.toFixed(6)).join(', ')}`;
      }
      if (state.rates) {
        const factor = loadedOptions?.units === 'degrees' ? 180 / Math.PI : 1;
        stateReadout.textContent += `\np, q, r (${loadedOptions?.body.toUpperCase()}): ${state.rates.map(v => (v * factor).toFixed(3)).join(', ')} ${factor === 1 ? 'rad/s' : 'deg/s'}`;
      }
    }
    positionText.textContent = `${(geo.latitude * 180 / Math.PI).toFixed(2)}° lat · ${(geo.longitude * 180 / Math.PI).toFixed(2)}° lon · ${(geo.height / 1000).toFixed(1)} km altitude`;
  }
  function overview() {
    following = false;
    follow.setAttribute('aria-pressed', 'false');
    viewer.trackedEntity = undefined;
    const sphere = BoundingSphere.fromPoints(routePositions);
    viewer.camera.flyToBoundingSphere(sphere, { duration: 0, offset: new HeadingPitchRange(0, -0.9, Math.max(1_000_000, sphere.radius * 3.4)) });
    viewer.scene.requestRender();
  }
  async function updateModel() {
    const token = ++revision;
    const definition = models.find(model => model.id === picker.value)!;
    const assembly = definition.create();
    try {
      // Cesium converts glTF +Z forward / +Y up to its vehicle frame.
      if (definition.id === 'burevestnik') assembly.root.rotation.y = Math.PI / 2;
      else assembly.root.rotation.x = Math.PI / 2;
      const binary = await new GLTFExporter().parseAsync(assembly.root, { binary: true });
      if (disposed || token !== revision) return;
      const url = URL.createObjectURL(new Blob([binary as ArrayBuffer], { type: 'model/gltf-binary' }));
      const oldURL = modelURL;
      modelURL = url;
      if (vehicle) vehicle.model = new ModelGraphics({ uri: url, minimumPixelSize: 150, scale: 1500, lightColor: new Color(2, 2, 2) });
      if (oldURL) URL.revokeObjectURL(oldURL);
      viewer.scene.requestRender();
    } catch (cause) {
      console.error(cause);
      message.textContent = 'The vehicle model could not load. The position marker still shows the flight.';
    } finally { assembly.dispose(); }
  }
  function loadFlight(text: string) {
    pause();
    try {
      const options = dof.value === 'trajectory' ? undefined : stateOptions();
      const parsed = options ? parseStateVector(text, options) : parseFlight(text);
      const path = createFlightPath(parsed);
      loadedOptions = options;
      samples = parsed;
      geographicAt = path;
      duration = samples.at(-1)!.time;
      start = JulianDate.fromIso8601('2026-01-01T00:00:00Z');
      viewer.clock.startTime = start.clone();
      viewer.clock.stopTime = JulianDate.addSeconds(start, duration, new JulianDate());
      viewer.clock.currentTime = start.clone();
      viewer.clock.clockRange = ClockRange.CLAMPED;
      viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
      viewer.clock.multiplier = 1;
      viewer.entities.removeAll();
      routePositions = [];
      // A bounded display trail, independent of the full-resolution replay data.
      const count = Math.min(2000, Math.max(200, samples.length));
      for (let i = 0; i <= count; i++) {
        const geo = geographicAt(duration * i / count);
        routePositions.push(Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height));
      }
      viewer.entities.add({ polyline: { positions: routePositions, width: 2, material: Color.CYAN.withAlpha(0.75) } });
      for (const [index, name] of [[0, 'Start'], [samples.length - 1, 'Finish']] as const) {
        const sample = samples[index];
        viewer.entities.add({ position: Cartesian3.fromDegrees(sample.longitude, sample.latitude, sample.altitude),
          point: { pixelSize: 8, color: Color.WHITE }, label: { text: name, font: '14px sans-serif', showBackground: true, pixelOffset: new Cartesian2(0, -24) } });
      }
      const position = new CallbackPositionProperty((time, result) => {
        const geo = geographicAt(JulianDate.secondsDifference(time!, start));
        return Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height, undefined, result);
      }, false);
      const velocity = new VelocityOrientationProperty(position);
      let orientation: SampledProperty | CallbackProperty = new CallbackProperty((time, result) => {
        if (samples[0].velocityECEF) {
          const seconds = JulianDate.secondsDifference(time!, start);
          const supplied = interpolateState(samples, seconds).velocity!;
          const origin = position.getValue(time!)!;
          const vector = new Cartesian3(...supplied);
          if (Cartesian3.magnitude(vector) > 1e-9) {
            Cartesian3.normalize(vector, vector);
            return Quaternion.fromRotationMatrix(Transforms.rotationMatrixFromPositionVelocity(origin, vector), result);
          }
          return Quaternion.fromRotationMatrix(Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(origin), new Matrix3()), result);
        }
        const seconds = Math.max(0, Math.min(duration - Math.min(0.02, duration / 2), JulianDate.secondsDifference(time!, start)));
        const rotation = velocity.getValue(JulianDate.addSeconds(start, seconds, new JulianDate()), result);
        if (rotation) return rotation;
        // Stationary samples have no direction of travel: use the local ENU frame.
        const origin = position.getValue(time!)!;
        return Quaternion.fromRotationMatrix(Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(origin), new Matrix3()), result);
      }, false);
      if (samples[0].attitudeECEF) {
        orientation = new SampledProperty(Quaternion);
        for (const sample of samples) orientation.addSample(JulianDate.addSeconds(start, sample.time, new JulianDate()), new Quaternion(...sample.attitudeECEF!));
      } else if (samples[0].angles) {
        orientation = new SampledProperty(Quaternion);
        for (const sample of samples) {
          const [roll, pitch, yaw] = sample.angles!.map(value => (value % 360) * Math.PI / 180);
          const local = new ThreeQuaternion().setFromEuler(new Euler(roll, pitch, yaw, 'ZYX'));
          const origin = Cartesian3.fromDegrees(sample.longitude, sample.latitude, sample.altitude);
          const frame = Quaternion.fromRotationMatrix(Matrix4.getMatrix3(Transforms.eastNorthUpToFixedFrame(origin), new Matrix3()));
          const rotation = Quaternion.multiply(frame, new Quaternion(local.x, local.y, local.z, local.w), new Quaternion());
          orientation.addSample(JulianDate.addSeconds(start, sample.time, new JulianDate()), rotation);
        }
      }
      vehicle = viewer.entities.add({ name: 'Vehicle', position, orientation,
        point: { pixelSize: 6, color: Color.ORANGE },
        viewFrom: new Cartesian3(-350000, -350000, 220000),
        ...(modelURL ? { model: { uri: modelURL, minimumPixelSize: 150, scale: 1500, lightColor: new Color(2, 2, 2) } } : {}),
      });
      seek.max = String(duration);
      updateReadout(); overview();
      message.textContent = `${samples.length} samples loaded · ${samples[0].angles ? 'imported orientation' : 'faces along route'} · 1× playback`;
      message.classList.remove('invalid');
      if (options) message.textContent = `${samples.length} samples loaded · ${options.dof}DOF · ${options.position.toUpperCase()} position · ${options.velocity.toUpperCase()} velocity${options.dof === '6' ? ` · ${options.attitude}, ${options.frame.toUpperCase()}, ${options.body.toUpperCase()}` : ''}. Supplied states are replayed; velocities and rates are not integrated.`;
    } catch (cause) {
      message.textContent = cause instanceof Error ? cause.message : 'Could not load flight.';
      message.classList.add('invalid');
    }
  }
  picker.addEventListener('change', () => { void updateModel(); });
  play.addEventListener('click', () => {
    if (viewer.clock.shouldAnimate) { pause(); return; }
    if (currentSeconds() >= duration) viewer.clock.currentTime = start.clone();
    viewer.clock.shouldAnimate = true; play.textContent = 'Pause'; viewer.scene.requestRender();
  });
  seek.addEventListener('input', () => {
    pause(); viewer.clock.currentTime = JulianDate.addSeconds(start, Number(seek.value), new JulianDate());
    updateReadout(); viewer.scene.requestRender();
  });
  document.querySelector('#flight-restart')!.addEventListener('click', () => {
    pause(); viewer.clock.currentTime = start.clone(); updateReadout(); viewer.scene.requestRender();
  });
  document.querySelector('#flight-overview')!.addEventListener('click', overview);
  follow.addEventListener('click', () => {
    following = !following;
    if (!following) { overview(); return; }
    follow.setAttribute('aria-pressed', 'true'); viewer.trackedEntity = vehicle; viewer.scene.requestRender();
  });
  document.querySelector('#flight-load')!.addEventListener('click', () => loadFlight(csv.value));
  document.querySelector('#flight-example')!.addEventListener('click', () => { csv.value = dof.value === 'trajectory' ? exampleFlight : exampleState(stateOptions()); loadFlight(csv.value); });
  document.querySelector<HTMLInputElement>('#flight-file')!.addEventListener('change', async event => {
    pause();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { message.textContent = 'Use a CSV smaller than 5 MB.'; return; }
    try { csv.value = await file.text(); message.textContent = 'File opened locally. Click Load flight.'; }
    catch { message.textContent = 'Could not read CSV file.'; }
  });
  viewer.clock.onTick.addEventListener(() => {
    if (!visible || !viewer.clock.shouldAnimate) return;
    updateReadout(); viewer.scene.requestRender();
    if (currentSeconds() >= duration) pause();
  });
  viewer.scene.renderError.addEventListener((_scene, cause) => {
    pause(); message.textContent = 'Globe rendering stopped. Reload to restart it.'; console.error(cause);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; revision++; viewer.destroy();
    if (modelURL) URL.revokeObjectURL(modelURL);
  });
  csv.value = exampleFlight; loadFlight(exampleFlight);
  await updateModel();
  await addNotamLayer(viewer);
  document.querySelectorAll<HTMLButtonElement | HTMLInputElement>('#flyover-view button, #flight-time').forEach(control => { control.disabled = false; });
  return { setVisible(value: boolean) {
    visible = value; pause(); viewer.useDefaultRenderLoop = value;
    if (value) { viewer.resize(); viewer.scene.requestRender(); }
  } };
}
