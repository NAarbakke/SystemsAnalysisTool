import '../style.css';
import './style.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '../theme.ts';
import * as Plotly from 'plotly.js-basic-dist-min';
import type { PlotlyHTMLElement, PlotRelayoutEvent } from 'plotly.js';
import { defaultTime, demoTable, plotSamples, timeValues, type Dataset } from './data.ts';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = get<HTMLDivElement>('plot-grid');
const timeSelect = get<HTMLSelectElement>('time-column');
const status = get<HTMLDivElement>('import-status');
const renderStatus = get<HTMLParagraphElement>('render-status');
const linked = get<HTMLInputElement>('linked-zoom');
const markers = get<HTMLInputElement>('show-markers');
let data: Dataset = demoTable();
let selected = new Set<string>();
let timeColumn = defaultTime(data);
let plots: PlotlyHTMLElement[] = [];
let revision = 0;
let syncing = false;
let zoom: [number, number] | undefined;
let worker: Worker | undefined;
let importing = 0;
const colors = ['#b84b27', '#427d86', '#758146', '#85649e', '#ad7622', '#477761'];

function message(text: string, error = false) {
  status.textContent = text; status.classList.toggle('invalid', error);
}
function listQuantities() {
  const query = get<HTMLInputElement>('quantity-search').value.trim().toLowerCase();
  const list = get<HTMLDivElement>('quantity-list');
  list.replaceChildren();
  const quantities = data.columns.filter(c => c !== timeColumn);
  for (const column of quantities.filter(c => c.toLowerCase().includes(query))) {
    const label = document.createElement('label'); label.className = 'quantity-option';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(column);
    const name = document.createElement('span'); name.textContent = column;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(column); else selected.delete(column);
      updateCount(); scheduleRender();
    });
    label.append(checkbox, name); list.append(label);
  }
  if (!list.childElementCount) { const p = document.createElement('p'); p.textContent = 'No matching quantities.'; list.append(p); }
  updateCount();
}
function updateCount() { get('selection-count').textContent = `${selected.size} / ${data.columns.length - 1}`; }

function loadDataset(next: Dataset, name: string, demo: boolean) {
  data = next; timeColumn = defaultTime(data); selected = new Set(data.columns.filter(c => c !== timeColumn)); zoom = undefined;
  timeSelect.replaceChildren(...data.columns.map(column => new Option(column, column)));
  timeSelect.value = timeColumn;
  get('dataset-name').textContent = demo ? '' : name;
  get('dataset-name').hidden = demo;
  get('dataset-header').hidden = demo;
  get<HTMLInputElement>('quantity-search').value = '';
  message(data.omitted.length ? `Skipped columns: ${data.omitted.join(', ')}.` : '');
  listQuantities(); scheduleRender();
}

async function parseInput(text: string, name: string) {
  if (text.length > 50 * 1024 * 1024) { message('Use a file smaller than 50 MB.', true); return; }
  worker?.terminate(); importing++;
  worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' });
  message('Reading and validating data…');
  const currentWorker = worker;
  worker.onmessage = (event: MessageEvent<{ data?: Dataset; error?: string }>) => {
    currentWorker.terminate();
    if (event.data.error) message(event.data.error + ' The previous dataset is still available.', true);
    else if (event.data.data) loadDataset(event.data.data, name, false);
  };
  worker.onerror = () => { currentWorker.terminate(); message('The import could not finish. Try a smaller file.', true); };
  worker.postMessage({ text, json: /^[\s\uFEFF]*[\[{]/.test(text) });
}

let renderTimer: ReturnType<typeof setTimeout>;
function scheduleRender() { clearTimeout(renderTimer); revision++; renderTimer = setTimeout(() => void renderPlots(), 100); }

async function renderPlots() {
  const current = revision;
  for (const plot of plots) Plotly.purge(plot);
  plots = []; grid.replaceChildren();
  get('empty-selection').hidden = selected.size > 0;
  let x: number[];
  try { x = timeValues(data, timeColumn); }
  catch (error) { renderStatus.textContent = (error as Error).message; renderStatus.classList.add('invalid'); return; }
  renderStatus.classList.remove('invalid');
  const chosen = data.columns.filter(c => selected.has(c) && c !== timeColumn);
  renderStatus.textContent = chosen.length ? `Drawing ${chosen.length} plots…` : '';
  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue('--ink').trim(), line = style.getPropertyValue('--line').trim();
  const dark = document.documentElement.dataset.theme === 'dark';
  for (const [index, column] of chosen.entries()) {
    if (revision !== current) return;
    const card = document.createElement('article'); card.className = 'plot-card';
    const heading = document.createElement('div'); heading.className = 'plot-heading';
    const title = document.createElement('h3'); title.textContent = column;
    heading.append(title);
    const plot = document.createElement('div'); plot.className = 'chart'; plot.setAttribute('aria-label', `${column} versus ${timeColumn}`);
    const valid = data.values[column].filter((v): v is number => v !== null);
    let min = Infinity, max = -Infinity;
    for (const v of valid) { if (v < min) min = v; if (v > max) max = v; }
    const footer = document.createElement('p'); footer.className = 'plot-stats';
    footer.textContent = `MIN ${format(min)}    /    MAX ${format(max)}`;
    card.append(heading, plot, footer); grid.append(card);
    const samples = plotSamples(x, data.values[column]);
    const graph = await Plotly.newPlot(plot, [{
      type: 'scatter', mode: markers.checked ? 'lines+markers' : 'lines', x: samples.x, y: samples.y,
      line: { color: (style.getPropertyValue('--series-secondary').trim() ? [style.getPropertyValue('--accent').trim(),style.getPropertyValue('--series-secondary').trim()][index % 2] : '') || (dark ? ['#f1a17f', '#8ac9cd', '#b7c98a', '#c5a7e0', '#e1b569', '#8ebf9d'][index % 6] : colors[index % 6]), width: 1.8 },
      marker: { size: 3 }, connectgaps: false,
      hovertemplate: '%{x:.6g}<br>%{y:.6g}<extra></extra>',
    }], {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: style.getPropertyValue('--font-body').trim() || 'DM Sans Variable, sans-serif', color: ink, size: 11 },
      margin: { t: 25, r: 22, b: 52, l: 65 }, height: 260,
      xaxis: { title: { text: timeColumn, standoff: 12 }, automargin: true, gridcolor: line, zerolinecolor: line, ...(zoom ? { range: zoom } : { autorange: true }) },
      yaxis: { gridcolor: line, zerolinecolor: line, automargin: true },
      showlegend: false, hovermode: 'closest', dragmode: 'zoom',
    }, { responsive: true, displaylogo: false, scrollZoom: false, displayModeBar: 'hover',
      modeBarButtons: [['toImage'], ['zoom2d', 'pan2d'], ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d']],
      toImageButtonOptions: { filename: column.replace(/[^a-z0-9_-]/gi, '_'), format: 'png', scale: 2, width: 1100, height: 550 },
    });
    if (revision !== current) { Plotly.purge(graph); return; }
    plots.push(graph);
    graph.on('plotly_relayout', (event: PlotRelayoutEvent) => void syncZoom(graph, event));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
  if (revision === current) renderStatus.textContent = data.rows > 5000 ? 'Reduced samples · Full-data statistics' : '';
}

function format(value: number) { return Number.isFinite(value) ? Number(value.toPrecision(6)).toLocaleString('en-US', { maximumSignificantDigits: 6 }) : '—'; }

async function syncZoom(source: PlotlyHTMLElement, event: PlotRelayoutEvent) {
  if (syncing || !linked.checked) return;
  const e = event as Record<string, unknown>;
  if (e['xaxis.autorange'] !== true && e['xaxis.range[0]'] === undefined && e['xaxis.range'] === undefined) return;
  const range = e['xaxis.range'] as [number, number] | undefined;
  zoom = e['xaxis.autorange'] === true ? undefined : range ?? [Number(e['xaxis.range[0]']), Number(e['xaxis.range[1]'])];
  syncing = true;
  try { await Promise.all(plots.filter(p => p !== source).map(p => Plotly.relayout(p, zoom ? { 'xaxis.range': zoom } : { 'xaxis.autorange': true }))); }
  finally { syncing = false; }
}

get<HTMLInputElement>('data-file').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  if (!file) return;
  const request = ++importing;
  worker?.terminate();
  if (file.size > 50 * 1024 * 1024) { message('Use a file smaller than 50 MB.', true); input.value = ''; return; }
  try { const text = await file.text(); if (request === importing) await parseInput(text, file.name); }
  catch { message('Could not read this file.', true); }
  input.value = '';
});
get('load-paste').addEventListener('click', () => void parseInput(get<HTMLTextAreaElement>('paste-data').value, 'Pasted dataset'));
get('demo').addEventListener('click', () => { worker?.terminate(); importing++; loadDataset(demoTable(), 'Synthetic motion demo', true); });
get('download-demo').addEventListener('click', () => {
  const demo = demoTable();
  const csv = [demo.columns.join(','), ...Array.from({ length: demo.rows }, (_, i) => demo.columns.map(c => demo.values[c][i]).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'synthetic-motion-demo.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
timeSelect.addEventListener('change', () => {
  const old = timeColumn; timeColumn = timeSelect.value;
  selected.delete(timeColumn); selected.add(old); zoom = undefined; listQuantities(); scheduleRender();
});
get('quantity-search').addEventListener('input', listQuantities);
get('select-all').addEventListener('click', () => { selected = new Set(data.columns.filter(c => c !== timeColumn)); listQuantities(); scheduleRender(); });
get('select-none').addEventListener('click', () => { selected.clear(); listQuantities(); scheduleRender(); });
markers.addEventListener('change', scheduleRender);
get('reset-zoom').addEventListener('click', () => { zoom = undefined; scheduleRender(); });
get<HTMLSelectElement>('plot-columns').addEventListener('change', event => { grid.dataset.columns = (event.target as HTMLSelectElement).value; plots.forEach(p => Plotly.Plots.resize(p)); });
new MutationObserver(scheduleRender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-appearance', 'data-font'] });
export function setVisible(visible: boolean) {
  if (visible) requestAnimationFrame(() => plots.forEach(plot => Plotly.Plots.resize(plot)));
}
loadDataset(data, 'Synthetic motion demo', true);
