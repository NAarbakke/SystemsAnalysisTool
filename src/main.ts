import './style.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import './theme.ts';
import {
  ACESFilmicToneMapping, DirectionalLight, HemisphereLight, PerspectiveCamera,
  PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { models } from '../models/index.ts';
import { fromEulerDegrees, fromQuaternion, toEulerDegrees } from './orientation.ts';
import { createReplay } from './replay-controls.ts';
import { setupViewMenu } from './view-menu.ts';

const poseForm = document.querySelector<HTMLFormElement>('#orientation')!;
const poseFields = document.querySelector<HTMLFieldSetElement>('#pose-fields')!;
const rotationMode = document.querySelector<HTMLSelectElement>('#rotation-mode')!;
const rotationInputs = ['x', 'y', 'z', 'w'].map(axis => document.querySelector<HTMLInputElement>(`#rotation-${axis}`)!);
const rotationError = document.querySelector<HTMLParagraphElement>('#rotation-error')!;
const separation = document.querySelector<HTMLInputElement>('#separation')!;
const separationValue = document.querySelector<HTMLOutputElement>('#separation-value')!;

const host = document.querySelector<HTMLDivElement>('#viewport')!;
const button = document.querySelector<HTMLButtonElement>('#explode')!;
const label = document.querySelector<HTMLSpanElement>('#button-label')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const picker = document.querySelector<HTMLSelectElement>('#model-picker')!;
const heading = document.querySelector<HTMLHeadingElement>('h1')!;
const subtitle = document.querySelector<HTMLParagraphElement>('.subtitle')!;
let definition = models.find(entry => entry.id === location.hash.slice(1)) ?? models[0];
for (const entry of models) picker.add(new Option(entry.title, entry.id));
picker.value = definition.id;

function showError(message: string) {
  error.textContent = message;
  error.hidden = false;
  button.disabled = true;
  picker.disabled = true;
  poseFields.disabled = true;
  separation.disabled = true;
  label.textContent = 'Viewer unavailable';
}

try {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  let model = definition.create();
  scene.add(model.root, new HemisphereLight(0xffffff, 0x789099, 2));
  const key = new DirectionalLight(0xffffff, 2.8);
  key.position.set(3, 6, 5);
  scene.add(key);
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const camera = new PerspectiveCamera(32, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .1;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 45;
  controls.target.copy(model.bounds.getCenter(new Vector3()));
  const viewingDirection = new Vector3(...definition.view).normalize();

  let frame = 0;
  let lastTime = 0;
  let amount = 0;
  let target = 0;
  let from = 0;
  let elapsed = 0;
  let moving = false;
  let disposed = false;
  let contextLost = false;
  let assemblyVisible = true;
  const duration = 1.25;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const replay = createReplay(rotation => {
    model.root.quaternion.copy(rotation);
    model.root.updateMatrixWorld(true);
    syncOrientation();
  }, fitReplay, requestRender);

  function requestRender() {
    if (!frame && !disposed && !contextLost && !document.hidden && assemblyVisible) frame = requestAnimationFrame(render);
  }

  function render(time: number) {
    frame = 0;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
    lastTime = time;
    replay.tick(time);
    if (moving) {
      elapsed += dt;
      const t = Math.min(1, elapsed / duration);
      const eased = t * t * (3 - 2 * t);
      amount = from + (target - from) * eased;
      model.setExplosion(amount);
      syncSeparation();
      if (t === 1) {
        moving = false;
        status.textContent = target ? 'Assembly exploded.' : 'Assembly assembled.';
      }
    }
    const cameraChanged = controls.update();
    renderer.render(scene, camera);
    if (moving || cameraChanged || replay.playing) requestRender();
    else lastTime = 0;
  }

  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Fit the projected corners of both poses, including a comfortable margin.
    const right = new Vector3().crossVectors(camera.up, viewingDirection).normalize();
    const up = new Vector3().crossVectors(viewingDirection, right).normalize();
    const tanVertical = Math.tan(camera.fov * Math.PI / 360);
    let distance = 0;
    for (const x of [model.bounds.min.x, model.bounds.max.x]) {
      for (const y of [model.bounds.min.y, model.bounds.max.y]) {
        for (const z of [model.bounds.min.z, model.bounds.max.z]) {
          const point = new Vector3(x, y, z).applyQuaternion(model.root.quaternion).sub(controls.target);
          distance = Math.max(distance, point.dot(viewingDirection) + 1.2 * Math.max(
            Math.abs(point.dot(right)) / (tanVertical * camera.aspect),
            Math.abs(point.dot(up)) / tanVertical));
        }
      }
    }
    if (replay.loaded && controls.target.lengthSq() === 0) {
      // A sphere about the model origin encloses all rotations and separation levels.
      const radius = Math.max(model.bounds.min.length(), model.bounds.max.length(),
        new Vector3(Math.max(Math.abs(model.bounds.min.x), Math.abs(model.bounds.max.x)),
          Math.max(Math.abs(model.bounds.min.y), Math.abs(model.bounds.max.y)),
          Math.max(Math.abs(model.bounds.min.z), Math.abs(model.bounds.max.z))).length());
      const halfFov = Math.atan(tanVertical * Math.min(1, camera.aspect));
      distance = 1.2 * radius / Math.sin(halfFov);
    }
    distance = Math.max(controls.minDistance, distance);
    camera.position.copy(controls.target).addScaledVector(viewingDirection, distance);
    controls.maxDistance = Math.max(45, distance * 2);
    camera.far = controls.maxDistance + model.bounds.getSize(new Vector3()).length();
    camera.updateProjectionMatrix();
    controls.update();
    requestRender();
  }

  function describeModel() {
    heading.textContent = definition.title;
    subtitle.textContent = `${definition.description} · ${model.parts.length} pieces`;
    document.title = `${definition.title} — SystemsAnalysisTool`;
    host.setAttribute('aria-label', `Interactive ${definition.title} model. Drag to rotate and scroll to zoom.`);
  }

  function syncSeparation() {
    const percent = Math.round(amount * 100);
    separation.value = String(percent);
    separationValue.value = `${percent}%`;
  }

  function syncOrientation() {
    const quaternionMode = rotationMode.value === 'quaternion';
    const values = quaternionMode ? model.root.quaternion.toArray() : toEulerDegrees(model.root.quaternion);
    values.forEach((value, i) => { rotationInputs[i].value = String(Number(value.toPrecision(12))); });
    document.querySelector<HTMLElement>('#w-field')!.hidden = !quaternionMode;
    rotationInputs[3].disabled = !quaternionMode;
    document.querySelector<HTMLElement>('#rotation-help')!.textContent = quaternionMode
      ? 'x, y, z, w · normalized on apply' : 'Intrinsic XYZ order · degrees';
    rotationError.hidden = true;
  }

  function frameOrientation() {
    // Preserve the camera's direction while fitting both assembled/exploded poses.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    viewingDirection.copy(camera.position).sub(controls.target).normalize();
    controls.target.copy(model.bounds.getCenter(new Vector3()).applyQuaternion(model.root.quaternion));
    model.root.updateMatrixWorld(true);
    resize();
  }

  function fitReplay() {
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    viewingDirection.copy(camera.position).sub(controls.target).normalize();
    controls.target.set(0, 0, 0);
    resize();
  }

  rotationInputs.forEach(input => input.addEventListener('focus', () => replay.pause()));

  rotationMode.addEventListener('change', syncOrientation);
  poseForm.addEventListener('submit', event => {
    event.preventDefault();
    replay.pause();
    try {
      const values = rotationInputs.slice(0, rotationMode.value === 'euler' ? 3 : 4).map(input => input.valueAsNumber);
      model.root.quaternion.copy(rotationMode.value === 'euler' ? fromEulerDegrees(values) : fromQuaternion(values));
      syncOrientation();
      frameOrientation();
      status.textContent = 'Vehicle orientation applied.';
    } catch (cause) {
      rotationError.textContent = cause instanceof Error ? cause.message : 'Invalid orientation.';
      rotationError.hidden = false;
    }
  });
  document.querySelector('#reset-orientation')!.addEventListener('click', () => {
    replay.pause();
    model.root.quaternion.identity();
    syncOrientation();
    frameOrientation();
    status.textContent = 'Vehicle orientation reset.';
  });
  separation.addEventListener('input', () => {
    moving = false;
    lastTime = 0;
    amount = Number(separation.value) / 100;
    target = amount;
    model.setExplosion(amount);
    syncSeparation();
    label.textContent = amount > 0 ? 'Assemble' : 'Explode assembly';
    button.setAttribute('aria-pressed', String(amount > 0));
    requestRender();
  });

  picker.addEventListener('change', () => {
    const next = models.find(entry => entry.id === picker.value)!;
    const nextModel = next.create();
    replay.reset();
    scene.remove(model.root);
    model.dispose();
    model = nextModel;
    definition = next;
    scene.add(model.root);
    moving = false;
    amount = target = from = elapsed = lastTime = 0;
    syncOrientation();
    syncSeparation();
    // Flush residual orbit damping before framing the newly selected model.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.target.copy(model.bounds.getCenter(new Vector3()));
    viewingDirection.fromArray(definition.view).normalize();
    label.textContent = 'Explode assembly';
    button.setAttribute('aria-pressed', 'false');
    status.textContent = `${definition.title} ready.`;
    history.replaceState(null, '', `#${definition.id}`);
    describeModel();
    resize();
  });

  button.addEventListener('click', () => {
    target = target ? 0 : 1;
    from = amount;
    elapsed = 0;
    lastTime = 0;
    label.textContent = target ? 'Assemble' : 'Explode assembly';
    button.setAttribute('aria-pressed', String(Boolean(target)));
    if (reducedMotion.matches) {
      amount = target;
      moving = false;
      model.setExplosion(amount);
      syncSeparation();
      status.textContent = target ? 'Assembly exploded.' : 'Assembly assembled.';
    } else {
      moving = true;
      status.textContent = target ? 'Exploding assembly.' : 'Assembling parts.';
    }
    requestRender();
  });
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', requestRender);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (!document.hidden) requestRender();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    showError('The graphics connection was interrupted. Reload the page to restart the viewer.');
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    model.dispose();
    environment.dispose();
    renderer.dispose();
  });

  describeModel();
  resize();
  button.disabled = false;
  picker.disabled = false;
  poseFields.disabled = false;
  separation.disabled = false;
  syncOrientation();
  setupViewMenu(visible => {
    assemblyVisible = visible;
    replay.pause();
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (visible) { resize(); requestRender(); }
  });
  label.textContent = 'Explode assembly';
  status.textContent = 'Assembly ready.';
} catch (cause) {
  console.error(cause);
  showError('This browser could not start the 3D viewer. Enable hardware acceleration and reload the page.');
}
