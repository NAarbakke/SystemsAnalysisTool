import { Color, Raycaster, Vector2, type Camera, type Material, type Mesh, type Object3D } from 'three';
import type { Assembly } from './assembly.ts';
import { readComponentInfo, readComponentStages, type ComponentStage } from './component-data.ts';

/** Selection is visual only: preserve original shared materials and model hierarchy. */
export function createComponentExplorer(canvas: HTMLCanvasElement, camera: Camera, render: () => void) {
  const list = document.querySelector<HTMLElement>('#component-list')!;
  const search = document.querySelector<HTMLInputElement>('#component-search')!;
  const name = document.querySelector<HTMLElement>('#component-name')!;
  const properties = document.querySelector<HTMLElement>('#component-properties')!;
  const materialLabel = document.querySelector<HTMLElement>('#component-material')!;
  const cadProperties = document.querySelector<HTMLElement>('#component-cad-properties')!;
  const panel = document.querySelector<HTMLElement>('#component-panel')!;
  const operation = document.querySelector<HTMLElement>('#component-operation')!;
  const stageSelect = document.querySelector<HTMLSelectElement>('#component-stage')!;
  const readings = document.querySelector<HTMLElement>('#component-readings')!;
  const dataSource = document.querySelector<HTMLElement>('#component-data-source')!;
  let stages: ComponentStage[] = [], activeStage = '';
  function showReadings() {
    readings.replaceChildren();
    const stage = stages.find(s => s.id === stageSelect.value);
    if (!stage) return;
    activeStage = stage.id;
    for (const reading of stage.readings) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = reading.label;
      dd.textContent = `${reading.value.toLocaleString(undefined, { maximumFractionDigits:3 })} ${reading.unit}`.trim();
      readings.append(dt, dd);
    }
    if (!stage.readings.length) { const dd = document.createElement('dd'); dd.textContent = 'No readings supplied.'; readings.append(dd); }
  }
  stageSelect.addEventListener('change', showReadings);
  const raycaster = new Raycaster();
  let model: Assembly, selected: Mesh | undefined, original: Material | Material[] | undefined;
  let highlights: Material[] = [];
  let down: { x:number; y:number; id:number } | undefined;
  let dragged = false;
  function clear() {
    if (selected && original) selected.material = original;
    highlights.forEach(material => material.dispose()); highlights = [];
    selected = undefined; original = undefined; markSelected();
    name.textContent = 'Select a component'; properties.replaceChildren();
    operation.hidden = true; readings.replaceChildren(); stages = [];
    materialLabel.textContent = ''; cadProperties.hidden = true;
    render();
  }
  function select(mesh?: Mesh) {
    if (mesh === selected) { clear(); return; }
    clear(); if (!mesh) return;
    selected = mesh; original = mesh.material;
    highlights = (Array.isArray(original) ? original : [original]).map(material => {
      const copy = material.clone();
      const surface = copy as Material & { emissive?: Color; emissiveIntensity?: number; color?: Color };
      if (surface.emissive) { surface.emissive.set('#f5883a'); surface.emissiveIntensity = .55; }
      else surface.color?.lerp(new Color('#ffab6b'), .5);
      return copy;
    });
    mesh.material = Array.isArray(original) ? highlights : highlights[0];
    name.textContent = mesh.name || 'Unnamed component';
    const path: string[] = [];
    let parent: Object3D | null = mesh.parent;
    while (parent && parent !== model.root) { if (parent.name) path.unshift(parent.name); parent = parent.parent; }
    const materials = Array.isArray(original) ? original : [original];
    const info = readComponentInfo(mesh.userData.componentInfo);
    materialLabel.textContent = `Material: ${info.material || 'Not specified'}`;
    cadProperties.hidden = false;
    const fields = [['Material', info.material || 'Not specified'],
      ['Part ID', info.partNumber || (typeof mesh.userData.partId === 'string' ? mesh.userData.partId : 'Not supplied')],
      ['Assembly path', path.join(' / ') || 'Assembly root'],
      ['Visual material', [...new Set(materials.map(m => m.name || 'Unnamed material'))].join(', ')],
      ['Component', `${model.parts.findIndex(p => p.mesh === mesh) + 1} / ${model.parts.length}`]];
    if (info.role) fields.splice(2,0,['Role',info.role]);
    if (info.massKg !== undefined) fields.push(['Mass',`${info.massKg} kg`]);
    if (info.finish) fields.push(['Finish',info.finish]);
    if (info.source) fields.push(['Property source',info.source]);
    for (const [label, value] of fields) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; properties.append(dt, dd); }
    stages = readComponentStages(mesh.userData.operatingStages);
    operation.hidden = stages.length === 0;
    stageSelect.replaceChildren(...stages.map(s => new Option(s.label, s.id)));
    stageSelect.hidden = stages.length < 2;
    document.querySelector<HTMLElement>('#component-stage-label')!.hidden = stages.length < 2;
    if (stages.some(s => s.id === activeStage)) stageSelect.value = activeStage;
    dataSource.textContent = typeof mesh.userData.operatingDataSource === 'string' ? mesh.userData.operatingDataSource.slice(0,160) : 'Supplied data';
    showReadings();
    search.value = ''; refreshList();
    list.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
    render();
    requestAnimationFrame(() => {
      if (selected === mesh && panel.scrollHeight > panel.clientHeight) panel.scrollTop = name.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 16;
    });
  }
  function markSelected() {
    for (const button of list.querySelectorAll<HTMLButtonElement>('button'))
      button.setAttribute('aria-pressed', String(model?.parts[Number(button.dataset.index)]?.mesh === selected && !!selected));
  }
  function refreshList() {
    const query = search.value.trim().toLowerCase();
    list.replaceChildren(...model.parts.flatMap((part, i) => {
      const label = part.mesh.name || `Component ${i + 1}`;
      if (!label.toLowerCase().includes(query)) return [];
      const button = document.createElement('button'); button.type = 'button'; button.dataset.index = String(i);
      const number = document.createElement('span'); number.textContent = String(i + 1).padStart(2, '0');
      const name = document.createElement('span'); name.textContent = label;
      button.append(number, name);
      button.addEventListener('click', () => select(part.mesh));
      return [button];
    }));
    markSelected();
  }
  search.addEventListener('input', refreshList);
  const start = (event: PointerEvent) => { if (event.button !== 0 || !event.isPrimary) { down = undefined; return; } down = { x:event.clientX, y:event.clientY, id:event.pointerId }; dragged = false; };
  const move = (event: PointerEvent) => { if (down && Math.hypot(event.clientX-down.x,event.clientY-down.y)>5) dragged = true; };
  const end = (event: PointerEvent) => {
    const start = down; down = undefined;
    if (!start || start.id !== event.pointerId || dragged || Math.hypot(event.clientX-start.x,event.clientY-start.y)>5) return;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) return;
    model.root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1), camera);
    select(raycaster.intersectObjects(model.parts.map(p=>p.mesh), false)[0]?.object as Mesh | undefined);
  };
  const cancel = () => { down = undefined; };
  canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', cancel);
  return { clear, setModel(next: Assembly) { clear(); activeStage = ''; model = next; search.value = ''; refreshList();
      document.querySelector('#component-count')!.textContent = `${next.parts.length} parts`; },
    dispose() { clear(); canvas.removeEventListener('pointerdown',start); canvas.removeEventListener('pointermove',move); canvas.removeEventListener('pointerup',end); canvas.removeEventListener('pointercancel',cancel); } };
}
