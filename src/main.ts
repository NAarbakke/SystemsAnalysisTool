import './style.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import './theme.ts';
import {
  ACESFilmicToneMapping, Box3, DirectionalLight, HemisphereLight, PerspectiveCamera,
  PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { assemblyModels as models, type ModelDefinition } from '../models/index.ts';
import type { Assembly } from './assembly.ts';
import { createComponentExplorer } from './component-explorer.ts';
import { setupViewMenu } from './view-menu.ts';

const separation = document.querySelector<HTMLInputElement>('#separation')!;
const separationValue = document.querySelector<HTMLOutputElement>('#separation-value')!;

const host = document.querySelector<HTMLDivElement>('#viewport')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const picker = document.querySelector<HTMLSelectElement>('#model-picker')!;
const assemblyFile = document.querySelector<HTMLInputElement>('#assembly-file')!;
const importStatus = document.querySelector<HTMLElement>('#assembly-import-status')!;
const importExample = document.querySelector<HTMLButtonElement>('#assembly-example')!;
let definition = models.find(entry => entry.id === location.hash.slice(1)) ?? models[0];
for (const entry of models) picker.add(new Option(entry.title, entry.id));
picker.value = definition.id;

function showError(message: string) {
  error.textContent = message;
  error.hidden = false;
  picker.disabled = true;

  separation.disabled = true;
}

try {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  let model = definition.create();
  let imported: { definition: ModelDefinition; assembly: Assembly } | undefined;
  scene.add(model.root, new HemisphereLight(0xffffff, 0x789099, .9));
  const key = new DirectionalLight(0xffffff, 2.2);
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
  controls.target.copy(new Box3().setFromObject(model.root).getCenter(new Vector3()));
  const viewingDirection = new Vector3(...definition.view).normalize();

  let frame = 0;
  let lastTime = 0;
  let amount = 0;
  let disposed = false;
  let contextLost = false;
  let assemblyVisible = true;

  function requestRender() {
    if (!frame && !disposed && !contextLost && !document.hidden && assemblyVisible) frame = requestAnimationFrame(render);
  }

  function render(time: number) {
    frame = 0;
    lastTime = time;

    const cameraChanged = controls.update();
    renderer.render(scene, camera);
    if (cameraChanged) requestRender();
    else lastTime = 0;
  }

  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Fit each built-in model to its current pose so exterior detail remains legible.
    const visibleBounds = ['ss-27','burevestnik','spindle','industrial-motor','turbofan'].includes(definition.id) ? new Box3().setFromObject(model.root) : model.bounds;
    // Fit the projected corners with a comfortable margin.
    const right = new Vector3().crossVectors(camera.up, viewingDirection).normalize();
    const up = new Vector3().crossVectors(viewingDirection, right).normalize();
    const tanVertical = Math.tan(camera.fov * Math.PI / 360);
    let distance = 0;
    for (const x of [visibleBounds.min.x, visibleBounds.max.x]) {
      for (const y of [visibleBounds.min.y, visibleBounds.max.y]) {
        for (const z of [visibleBounds.min.z, visibleBounds.max.z]) {
          const point = new Vector3(x, y, z).applyQuaternion(model.root.quaternion).sub(controls.target);
          distance = Math.max(distance, point.dot(viewingDirection) + 1.2 * Math.max(
            Math.abs(point.dot(right)) / (tanVertical * camera.aspect),
            Math.abs(point.dot(up)) / tanVertical));
        }
      }
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
    if (assemblyVisible) document.title = `${definition.title} — SystemsAnalysisTool`;
    host.setAttribute('aria-label', `Interactive ${definition.title} model. Drag to rotate and scroll to zoom.`);
  }

  function syncSeparation() {
    const percent = Math.round(amount * 100);
    separation.value = String(percent);
    separationValue.value = `${percent}%`;
  }

  separation.addEventListener('input', () => {
    lastTime = 0;
    amount = Number(separation.value) / 100;
    model.setExplosion(amount);
    if(['ss-27','burevestnik','spindle','industrial-motor','turbofan'].includes(definition.id)){
      viewingDirection.copy(camera.position).sub(controls.target).normalize();
      controls.target.copy(new Box3().setFromObject(model.root).getCenter(new Vector3()));
      resize();
    }
    syncSeparation();
    requestRender();
  });

  function displayModel(next: ModelDefinition, nextModel: Assembly) {

    explorer.clear();
    scene.remove(model.root);
    if (model !== imported?.assembly) model.dispose();
    model = nextModel;
    definition = next;
    model.root.quaternion.identity();
    model.setExplosion(0);
    scene.add(model.root);
    amount = lastTime = 0;

    syncSeparation();
    // Flush residual orbit damping before framing the newly selected model.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.target.copy(new Box3().setFromObject(model.root).getCenter(new Vector3()));
    viewingDirection.fromArray(definition.view).normalize();
    status.textContent = `${definition.title} ready.`;
    history.replaceState(null, '', `#${definition.id}`);
    describeModel();
    explorer.setModel(model);
    resize();
  }
  picker.addEventListener('change', () => {
    const next = picker.value === 'local-import' ? imported!.definition : models.find(entry => entry.id === picker.value)!;
    displayModel(next, next.create());
  });

  async function importModel(read: () => Promise<ArrayBuffer>, name: string) {
    assemblyFile.disabled = true; importExample.disabled = true; picker.disabled = true;
    importStatus.dataset.error = 'false'; importStatus.textContent = 'Reading assembly…';
    try {
      const { loadImportedAssembly } = await import('./import-assembly.ts');
      const loaded = await loadImportedAssembly(await read());
      if (disposed) { loaded.assembly.dispose(); return; }
      const previousImport = imported, previousModel = model;
      const next: ModelDefinition = { id:'local-import', title:name.replace(/\.glb$/i, ''), description:'Imported GLB', view:[7,4,9], create:() => loaded.assembly };
      imported = { definition:next, assembly:loaded.assembly };
      let option = picker.querySelector<HTMLOptionElement>('option[value="local-import"]');
      if (!option) { option = new Option(next.title, 'local-import'); picker.add(option); }
      option.textContent = next.title; picker.value = 'local-import';
      displayModel(next, loaded.assembly);
      if (previousImport && previousImport.assembly !== previousModel) previousImport.assembly.dispose();
      importStatus.textContent = `${loaded.assembly.parts.length} meshes imported${loaded.animationsIgnored ? ' · Static pose' : ''}`;
    } catch (cause) {
      importStatus.dataset.error = 'true';
      importStatus.textContent = `${cause instanceof Error ? cause.message : 'Could not read this assembly.'} The current model is unchanged.`;
    } finally {
      assemblyFile.value = '';
      assemblyFile.disabled = importExample.disabled = picker.disabled = contextLost || disposed;
    }
  }
  assemblyFile.addEventListener('change', () => {
    const file = assemblyFile.files?.[0]; if (!file) return;
    if (!/\.glb$/i.test(file.name) || file.size > 100 * 1024 * 1024) {
      importStatus.dataset.error = 'true'; importStatus.textContent = 'Choose a self-contained .glb file smaller than 100 MB.'; assemblyFile.value = ''; return;
    }
    void importModel(() => file.arrayBuffer(), file.name);
  });
  importExample.addEventListener('click', () => { void importModel(async () => {
    const response = await fetch(new URL('./data/assembly-import/example.glb', document.baseURI));
    if (!response.ok) throw new Error('The example GLB could not be loaded.');
    return response.arrayBuffer();
  }, 'Example fixture.glb'); });

  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', requestRender);
  const explorer = createComponentExplorer(renderer.domElement, camera, requestRender);
  explorer.setModel(model);
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
    explorer.dispose();
    controls.dispose();
    model.dispose();
    if (imported && imported.assembly !== model) imported.assembly.dispose();
    environment.dispose();
    renderer.dispose();
  });

  describeModel();
  resize();
  picker.disabled = false;
  assemblyFile.disabled = false;

  separation.disabled = false;

  setupViewMenu(visible => {
    assemblyVisible = visible;

    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (visible) { resize(); requestRender(); }
  });
  status.textContent = 'Assembly ready.';
} catch (cause) {
  console.error(cause);
  showError('This browser could not start the 3D viewer. Enable hardware acceleration and reload the page.');
}
