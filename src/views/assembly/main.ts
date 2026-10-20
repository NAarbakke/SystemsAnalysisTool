import './style.css';
import markup from './view.html?raw';
import { Box3, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assemblyModels as models, type ModelDefinition } from '../../../models/assemblies/index.ts';
import { APP_NAME } from '../../app/shell.ts';
import type { ViewController } from '../../app/views.ts';
import { finder } from '../../core/dom.ts';
import type { Assembly } from '../../three/assembly.ts';
import { describeImport, isImportable, MAX_IMPORT_BYTES } from '../../three/import/formats.ts';
import { createStage } from '../../three/stage.ts';
import { createComponentExplorer } from './component-explorer.ts';

const IMPORTED = 'local-import';

export async function mount(container: HTMLElement): Promise<ViewController> {
  container.innerHTML = markup;
  const $ = finder(container);
  const separation = $<HTMLInputElement>('separation');
  const separationValue = $<HTMLOutputElement>('separation-value');
  const host = $<HTMLDivElement>('viewport');
  const status = $('status');
  const error = $('error');
  const picker = $<HTMLSelectElement>('model-picker');
  const assemblyFile = $<HTMLInputElement>('assembly-file');
  const importStatus = $('assembly-import-status');
  const importExample = $<HTMLButtonElement>('assembly-example');
  let definition = models.find(entry => entry.id === location.hash.slice(1)) ?? models[0];
  for (const entry of models) picker.add(new Option(entry.title, entry.id));
  picker.value = definition.id;
  let visible = false;

  /** Builds a model, showing progress: some load files and a CAD kernel and take seconds. */
  async function build(next: ModelDefinition) {
    status.textContent = importStatus.textContent = `Loading ${next.title}…`;
    importStatus.dataset.error = 'false';
    try {
      const built = await next.create();
      importStatus.textContent = '';
      return built;
    } catch (cause) {
      console.error(cause);
      importStatus.dataset.error = 'true';
      importStatus.textContent = `${next.title} could not load.${cause instanceof Error ? ` ${cause.message}` : ''}`;
      throw cause;
    }
  }

  function showError(message: string) {
    error.textContent = message;
    error.hidden = false;
    picker.disabled = true;
    separation.disabled = true;
  }

  try {
    const renderer = new WebGLRenderer({ alpha: true, powerPreference: 'high-performance' });
    // Frames are drawn only on interaction, so supersample: at least 2x, up to 3x on high-DPI screens.
    const supersample = () => renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1) * 2, 3));
    supersample();
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    let model: Assembly;
    try { model = await build(definition); }
    catch {
      // A model that cannot load (such as a missing STEP file) should not take the viewer down with it.
      definition = models[0]; picker.value = definition.id;
      model = await build(definition);
    }
    let imported: { definition: ModelDefinition; assembly: Assembly } | undefined;
    scene.add(model.root);

    const camera = new PerspectiveCamera(32, 1, .1, 100);
    const stage = createStage(renderer, scene, camera);
    stage.setModel(model);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .1;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 45;
    controls.target.copy(new Box3().setFromObject(model.root).getCenter(new Vector3()));
    const viewingDirection = new Vector3(...definition.view).normalize();

    let frame = 0;
    let amount = 0;
    let disposed = false;
    let contextLost = false;
    let loading = 0;

    function requestRender() {
      if (!frame && !disposed && !contextLost && !document.hidden && visible) frame = requestAnimationFrame(render);
    }

    function render() {
      frame = 0;
      const cameraChanged = controls.update();
      stage.render();
      explorer.placeTag();
      if (cameraChanged) requestRender();
    }

    function resize() {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      supersample();
      renderer.setSize(width, height);
      stage.setSize(width, height);
      stage.fit(model);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Fit each built-in model to its current pose so exterior detail remains legible.
      const visibleBounds = definition.id !== IMPORTED ? new Box3().setFromObject(model.root) : model.bounds;
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
      if (visible) document.title = `${definition.title} — ${APP_NAME}`;
      host.setAttribute('aria-label', `Interactive ${definition.title} model. Drag to rotate and scroll to zoom.`);
    }

    function syncSeparation() {
      const percent = Math.round(amount * 100);
      separation.value = String(percent);
      separationValue.value = `${percent}%`;
    }

    separation.addEventListener('input', () => {
      amount = Number(separation.value) / 100;
      model.setExplosion(amount);
      stage.fit(model);
      if (definition.id !== IMPORTED) {
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
      stage.setModel(model);
      amount = 0;

      syncSeparation();
      // Flush residual orbit damping before framing the newly selected model.
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      controls.target.copy(new Box3().setFromObject(model.root).getCenter(new Vector3()));
      viewingDirection.fromArray(definition.view).normalize();
      status.textContent = `${definition.title} ready.`;
      history.replaceState(null, '', `${location.search}#${definition.id}`);
      describeModel();
      explorer.setModel(model);
      resize();
    }
    picker.addEventListener('change', async () => {
      const next = picker.value === IMPORTED ? imported!.definition : models.find(entry => entry.id === picker.value)!;
      // A later choice wins; a model that finishes building after it is discarded.
      const token = ++loading;
      let nextModel: Assembly;
      try { nextModel = await build(next); }
      catch { if (token === loading) picker.value = definition.id; return; }
      if (token !== loading || disposed) { if (nextModel !== imported?.assembly) nextModel.dispose(); return; }
      displayModel(next, nextModel);
    });

    async function importModel(read: () => Promise<ArrayBuffer>, name: string) {
      assemblyFile.disabled = true; importExample.disabled = true; picker.disabled = true;
      importStatus.dataset.error = 'false'; importStatus.textContent = 'Reading assembly…';
      try {
        const { loadImportedFile } = await import('../../three/import/load.ts');
        const loaded = await loadImportedFile(await read(), name);
        if (disposed) { loaded.assembly.dispose(); return; }
        loading++;
        const previousImport = imported, previousModel = model;
        const { title, format } = describeImport(name);
        const next: ModelDefinition = { id: IMPORTED, title, description: `Imported ${format}`, view: [7, 4, 9], create: async () => loaded.assembly };
        imported = { definition: next, assembly: loaded.assembly };
        let option = picker.querySelector<HTMLOptionElement>(`option[value="${IMPORTED}"]`);
        if (!option) { option = new Option(next.title, IMPORTED); picker.add(option); }
        option.textContent = next.title; picker.value = IMPORTED;
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
      if (!isImportable(file.name) || file.size > MAX_IMPORT_BYTES) {
        importStatus.dataset.error = 'true'; importStatus.textContent = 'Choose a .glb, .stl or .step file smaller than 100 MB.'; assemblyFile.value = ''; return;
      }
      if (/\.(stp|step)$/i.test(file.name)) importStatus.textContent = 'Reading STEP file. The CAD kernel loads on first use.';
      void importModel(() => file.arrayBuffer(), file.name);
    });
    importExample.addEventListener('click', () => { void importModel(async () => {
      const response = await fetch(new URL('./data/assembly-import/example.glb', document.baseURI));
      if (!response.ok) throw new Error('The example GLB could not be loaded.');
      return response.arrayBuffer();
    }, 'Example fixture.glb'); });

    new MutationObserver(requestRender).observe(document.documentElement, { attributeFilter: ['data-theme'] });
    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', requestRender);
    const explorer = createComponentExplorer(container, renderer.domElement, camera, requestRender);
    explorer.setModel(model);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(frame);
      frame = 0;
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
      stage.dispose();
      renderer.dispose();
    });

    describeModel();
    picker.disabled = false;
    assemblyFile.disabled = false;
    separation.disabled = false;
    status.textContent = 'Assembly ready.';

    return {
      setVisible(next) {
        visible = next;
        cancelAnimationFrame(frame); frame = 0;
        if (visible) { resize(); requestRender(); }
      },
      title: () => definition.title,
    };
  } catch (cause) {
    console.error(cause);
    showError('This browser could not start the 3D viewer. Enable hardware acceleration and reload the page.');
    return { setVisible() {} };
  }
}
