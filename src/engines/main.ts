import './style.css';
import markup from './view.html?raw';
import { renderDiagram } from '../../models/engine-diagrams/views.js';
import type { Part } from '../../models/engine-diagrams/shared.js';
import turbojet from '../../models/engine-diagrams/turbojet/model.js';
import turbofan from '../../models/engine-diagrams/turbofan/model.js';
import solid from '../../models/engine-diagrams/solid-rocket/model.js';
import liquid from '../../models/engine-diagrams/liquid-rocket/model.js';

type EngineModel = { id: string; name: string; badge: string; note: string; description?: string; reference?: string; svg?: string; flow?: string; background?: string; defs?: string; parts: Part[] };

document.querySelector('#engines-view')!.innerHTML = markup;
const models: Record<string, EngineModel> = { turbojet, turbofan, solid, liquid };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const svg = document.querySelector<SVGSVGElement>('#engine-svg')!, scene = document.querySelector<SVGGElement>('#engine-scene')!;
const flowToggle = $<HTMLInputElement>('flow-toggle');
let model: EngineModel, selected: string | undefined, scale = 1, offset = { x: 0, y: 0 }, visible = false;
let drag: { id: number; start: DOMPoint; clientX: number; clientY: number; offset: { x: number; y: number }; part?: string; moved: boolean } | undefined;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
flowToggle.checked = !reducedMotion.matches;

function updateFlow() {
  svg.classList.toggle('flow-visible', flowToggle.checked && !!model?.flow);
  svg.classList.toggle('flow-running', flowToggle.checked && !document.hidden && visible);
}
function renderView() {
  scene.setAttribute('transform', `translate(${offset.x} ${offset.y}) scale(${scale})`);
  $<HTMLOutputElement>('zoom-level').value = `${Math.round(scale * 100)}%`;
  $<HTMLButtonElement>('zoom-out').disabled = scale <= .35; $<HTMLButtonElement>('zoom-in').disabled = scale >= 4;
}
// All authored diagrams share one viewBox, so fitting is a reset.
function fitView() { scale = 1; offset = { x: 0, y: 0 }; renderView(); }
function point(event: { clientX: number; clientY: number }) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
}
function zoom(factor: number, anchor: { x: number; y: number } = { x: 600, y: 280 }) {
  const next = Math.min(4, Math.max(.35, scale * factor));
  offset = { x: anchor.x - (anchor.x - offset.x) * next / scale, y: anchor.y - (anchor.y - offset.y) * next / scale };
  scale = next; renderView();
}
function select(id?: string) {
  selected = id === selected ? undefined : id;
  document.querySelectorAll<SVGElement>('#engines-view [data-label]').forEach(el => el.classList.toggle('active', el.dataset.label === selected));
  const part = model.parts.find(part => part.id === selected);
  document.querySelectorAll<HTMLElement>('#engines-view [data-part]').forEach(el => {
    el.classList.toggle('selected', el.dataset.part === selected);
    el.setAttribute('aria-pressed', String(el.dataset.part === selected));
  });
  $('selected-name').textContent = part?.name || 'Overview';
  $('selected-role').textContent = part?.role || model.description || 'Select a component to explore this conceptual section.';
  $('selection-index').textContent = part ? String(model.parts.indexOf(part) + 1).padStart(2, '0') : '—';
  const readings = part ? part.readings : [];
  $('readings').hidden = readings.length === 0;
  $('readings').replaceChildren(...readings.map(([label, value, unit]) => {
    const card = document.createElement('div'); card.className = 'reading';
    const title = document.createElement('span'); title.textContent = label;
    const number = document.createElement('strong'); number.textContent = value;
    const suffix = document.createElement('small'); suffix.textContent = unit;
    number.append(suffix); card.append(title, number); return card;
  }));
}
function loadModel(id: string) {
  model = models[id] || turbofan; selected = undefined;
  $('diagram-badge').textContent = model.badge;
  $('data-note').textContent = model.note;
  const reference = $<HTMLAnchorElement>('reference-link');
  reference.hidden = !model.reference;
  if (model.reference) reference.href = model.reference;
  svg.setAttribute('aria-label', `${model.name} selectable schematic`);
  // Authored drawings carry their own markup and styling; the older models are composed from part geometry.
  scene.innerHTML = model.svg || renderDiagram(model);
  flowToggle.closest('label')!.hidden = !model.flow;
  $('component-buttons').replaceChildren(...model.parts.map((part, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.part = part.id;
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span'); name.textContent = part.name;
    button.append(number, name);
    button.addEventListener('click', () => select(part.id)); return button;
  }));
  select(undefined); fitView(); updateFlow();
}

$<HTMLSelectElement>('engine-model').addEventListener('change', event => loadModel((event.target as HTMLSelectElement).value));
$('zoom-in').addEventListener('click', () => zoom(1.25));
$('zoom-out').addEventListener('click', () => zoom(.8));
$('fit').addEventListener('click', fitView);
flowToggle.addEventListener('change', updateFlow);
svg.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(-event.deltaY * .001), point(event)); }, { passive: false });
svg.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag) return;
  const target = (event.target as Element).closest<SVGElement>('[data-part],[data-label]');
  drag = { id: event.pointerId, start: point(event), clientX: event.clientX, clientY: event.clientY, offset: { ...offset }, part: target?.dataset.part || target?.dataset.label, moved: false };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  drag.moved ||= Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) > 5;
  if (!drag.moved) return;
  const cursor = point(event); offset = { x: drag.offset.x + cursor.x - drag.start.x, y: drag.offset.y + cursor.y - drag.start.y }; renderView();
});
svg.addEventListener('pointerup', event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.moved) select(drag.part);
  drag = undefined; svg.releasePointerCapture(event.pointerId);
});
svg.addEventListener('pointercancel', () => { drag = undefined; });
svg.addEventListener('lostpointercapture', () => { drag = undefined; });
svg.addEventListener('keydown', event => {
  const part = (event.target as Element).closest<SVGElement>('[data-part]');
  if (part && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(part.dataset.part); }
  if (event.key === 'Escape') { selected = undefined; select(undefined); }
});
document.addEventListener('visibilitychange', updateFlow);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) flowToggle.checked = false; updateFlow(); });
loadModel('turbojet');

export function setVisible(next: boolean) { visible = next; updateFlow(); }
