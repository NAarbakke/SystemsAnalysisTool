import './style.css';
import markup from './view.html?raw';
import { engines, type EngineModel } from '../../../models/engine-diagrams/index.js';
import { renderDiagram } from '../../../models/engine-diagrams/views.js';
import type { ViewController } from '../../app/views.ts';
import { el, finder, ordinal } from '../../core/dom.ts';

/** All authored diagrams share this viewBox centre, so zoom buttons anchor on it and fitting is a reset. */
const CENTRE = { x: 600, y: 280 }, MIN_SCALE = .35, MAX_SCALE = 4;

export function mount(container: HTMLElement): ViewController {
  container.innerHTML = markup;
  const $ = finder(container);
  const svg = $<SVGSVGElement>('engine-svg'), scene = $<SVGGElement>('engine-scene');
  const flowToggle = $<HTMLInputElement>('flow-toggle'), picker = $<HTMLSelectElement>('engine-model');
  let model: EngineModel, selected: string | undefined, scale = 1, offset = { x: 0, y: 0 }, visible = false;
  let drag: { id: number; start: DOMPoint; clientX: number; clientY: number; offset: { x: number; y: number }; part?: string; moved: boolean } | undefined;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  flowToggle.checked = !reducedMotion.matches;
  picker.replaceChildren(...engines.map(({ label, model }) => new Option(label, model.id)));

  function updateFlow() {
    svg.classList.toggle('flow-visible', flowToggle.checked && !!model?.flow);
    svg.classList.toggle('flow-running', flowToggle.checked && !document.hidden && visible);
  }
  function renderView() {
    scene.setAttribute('transform', `translate(${offset.x} ${offset.y}) scale(${scale})`);
    $<HTMLOutputElement>('zoom-level').value = `${Math.round(scale * 100)}%`;
    $<HTMLButtonElement>('zoom-out').disabled = scale <= MIN_SCALE; $<HTMLButtonElement>('zoom-in').disabled = scale >= MAX_SCALE;
  }
  function fitView() { scale = 1; offset = { x: 0, y: 0 }; renderView(); }
  function point(event: { clientX: number; clientY: number }) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
  }
  function zoom(factor: number, anchor: { x: number; y: number } = CENTRE) {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    offset = { x: anchor.x - (anchor.x - offset.x) * next / scale, y: anchor.y - (anchor.y - offset.y) * next / scale };
    scale = next; renderView();
  }
  function select(id?: string) {
    selected = id === selected ? undefined : id;
    container.querySelectorAll<SVGElement>('[data-label]').forEach(node => node.classList.toggle('active', node.dataset.label === selected));
    const part = model.parts.find(part => part.id === selected);
    container.querySelectorAll<HTMLElement>('[data-part]').forEach(node => {
      node.classList.toggle('selected', node.dataset.part === selected);
      node.setAttribute('aria-pressed', String(node.dataset.part === selected));
    });
    $('selected-name').textContent = part?.name || ''; $('selected-name').hidden = !part;
    $('selected-role').textContent = part?.role || ''; $('selected-role').hidden = !part;
    $('selection-index').textContent = part ? ordinal(model.parts.indexOf(part)) : '—';
    const readings = part ? part.readings : [];
    $('readings').hidden = readings.length === 0;
    $('readings').replaceChildren(...readings.map(([label, value, unit]) => el('div', { className: 'reading' },
      el('span', { textContent: label }), el('strong', { textContent: value }, el('small', { textContent: unit })))));
  }
  function loadModel(id: string) {
    model = (engines.find(entry => entry.model.id === id) ?? engines[0]).model; selected = undefined;
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
      const button = el('button', { type: 'button', dataset: { part: part.id } },
        el('span', { textContent: ordinal(index) }), el('span', { textContent: part.name }));
      button.addEventListener('click', () => select(part.id));
      return button;
    }));
    select(undefined); fitView(); updateFlow();
  }

  picker.addEventListener('change', () => loadModel(picker.value));
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
  loadModel(engines[0].model.id);

  return { setVisible(next) { visible = next; updateFlow(); } };
}
