import '../style.css';
import './style.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '../theme.ts';
import * as Plotly from 'plotly.js-basic-dist-min';
import type { PlotlyHTMLElement, PlotRelayoutEvent } from 'plotly.js';
import { defaultTime, demoTable, describeColumn, eventColumns, groupColumns, PALETTE, phaseEvents, plotSamples, seriesStats, timeValues, type Dataset } from './data.ts';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = get<HTMLDivElement>('plot-grid');
const timeSelect = get<HTMLSelectElement>('time-column');
const status = get<HTMLDivElement>('import-status');
const renderStatus = get<HTMLParagraphElement>('render-status');
const linked = get<HTMLInputElement>('linked-zoom');
const markers = get<HTMLInputElement>('show-markers');
const overviewStrip = get<HTMLElement>('overview-strip');
const overviewChart = get<HTMLDivElement>('overview-chart');
let overviewPlot: PlotlyHTMLElement | undefined;
let data: Dataset = demoTable();
let selected = new Set<string>();
let timeColumn = defaultTime(data);
let revision = 0;
let syncing = false;
let hovering = false;
let zoom: [number, number] | undefined;
let worker: Worker | undefined;
let importing = 0;

type Series = { column: string; label: string; color: string; x: number[]; y: (number | null)[]; cell: HTMLElement };
type Panel = { key: string; node: HTMLElement; chart: HTMLDivElement; plot?: PlotlyHTMLElement; series: Series[] };
const panels = new Map<string, Panel>();

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
  data = next; timeColumn = defaultTime(data);
  const events = eventColumns(data);
  selected = new Set(data.columns.filter(c => c !== timeColumn && !events.includes(c)));
  zoom = undefined;
  timeSelect.replaceChildren(...data.columns.map(column => new Option(column, column)));
  timeSelect.value = timeColumn;
  get('dataset-name').textContent = demo ? '' : name;
  get('dataset-name').hidden = demo;
  get('dataset-header').hidden = demo;
  get<HTMLInputElement>('quantity-search').value = '';
  message(data.omitted.length ? `Skipped columns: ${data.omitted.join(', ')}.` : '');
  for (const panel of panels.values()) { if (panel.plot) Plotly.purge(panel.plot); panel.node.remove(); }
  panels.clear();
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
  worker.postMessage({ text, json: /^[\s﻿]*[\[{]/.test(text) });
}

let renderTimer: ReturnType<typeof setTimeout>;
function scheduleRender() { clearTimeout(renderTimer); revision++; renderTimer = setTimeout(() => void renderPlots(), 100); }

function theme() {
  const style = getComputedStyle(document.documentElement);
  const read = (token: string) => style.getPropertyValue(token).trim();
  const dark = document.documentElement.dataset.theme !== 'light';
  return {
    dark, ink: read('--ink'), muted: read('--muted'), line: read('--line'), accent: read('--accent'),
    font: read('--font-body') || 'DM Sans Variable, sans-serif',
    palette: dark ? PALETTE.dark : PALETTE.light,
  };
}

function cell(row: HTMLElement, text: string, className?: string) {
  const span = document.createElement('span');
  span.textContent = text;
  if (className) span.className = className;
  row.append(span);
  return span;
}

/** Nearest drawn sample to a time value, so the readout matches the curve on screen. */
function nearest(x: number[], value: number) {
  let low = 0, high = x.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (x[mid] < value) low = mid + 1; else high = mid;
  }
  return low > 0 && Math.abs(x[low - 1] - value) <= Math.abs(x[low] - value) ? low - 1 : low;
}

function compact(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : Number(value.toPrecision(4)).toLocaleString('en-US', { maximumSignificantDigits: 4 });
}

function updateCursor(at: number | null) {
  for (const panel of panels.values())
    for (const series of panel.series)
      series.cell.textContent = at === null ? '—' : compact(series.y[nearest(series.x, at)]);
}

/* Plotly draws the spike on the chart under the pointer; the others are driven to the same
   time so one crosshair reads across the whole grid. Fx is not in the published typings. */
const Fx = (Plotly as unknown as { Fx?: { hover(gd: unknown, event: unknown, subplot?: string): void; unhover(gd: unknown): void } }).Fx;

function mirrorHover(source: PlotlyHTMLElement, at: number | null) {
  if (hovering || !Fx) return;
  hovering = true;
  try {
    for (const panel of panels.values()) {
      if (!panel.plot || panel.plot === source) continue;
      try { if (at === null) Fx.unhover(panel.plot); else Fx.hover(panel.plot, { xval: at }, 'xy'); } catch { /* the chart is mid-redraw */ }
    }
  } finally { hovering = false; }
}

function eventShapes(events: { time: number; label: string }[], colors: ReturnType<typeof theme>) {
  return events.map(event => ({
    type: 'line' as const, x0: event.time, x1: event.time, yref: 'paper' as const, y0: 0, y1: 1,
    line: { color: colors.muted, width: 1, dash: 'dot' as const }, layer: 'below' as const,
  }));
}

async function renderPlots() {
  const current = revision;
  get('empty-selection').hidden = selected.size > 0;
  let x: number[];
  try { x = timeValues(data, timeColumn); }
  catch (error) { renderStatus.textContent = (error as Error).message; renderStatus.classList.add('invalid'); return; }
  renderStatus.classList.remove('invalid');

  const chosen = data.columns.filter(c => selected.has(c) && c !== timeColumn);
  const colors = theme();
  const events = eventColumns(data).filter(c => c !== timeColumn).flatMap(c => phaseEvents(data, timeColumn, c));
  const eventSource = eventColumns(data).filter(c => c !== timeColumn);

  // Grouping is computed over every quantity, so a hue follows its column through any filter.
  const groups = groupColumns(data.columns.filter(c => c !== timeColumn))
    .map(group => ({ ...group, drawn: group.columns.filter(c => chosen.includes(c)) }))
    .filter(group => group.drawn.length);

  for (const [key, panel] of panels) {
    if (groups.some(group => group.key === key)) continue;
    if (panel.plot) Plotly.purge(panel.plot);
    panel.node.remove(); panels.delete(key);
  }

  const shapes = events.length ? eventShapes(events, colors) : [];
  for (const group of groups) {
    if (revision !== current) return;
    let panel = panels.get(group.key);
    if (!panel) {
      const node = document.createElement('article'); node.className = 'plot-panel';
      const chart = document.createElement('div'); chart.className = 'chart';
      panel = { key: group.key, node, chart, series: [] };
      panels.set(group.key, panel);
    }
    panel.node.replaceChildren();
    panel.series = [];

    const head = document.createElement('div'); head.className = 'panel-head';
    const title = document.createElement('h3'); title.textContent = group.label;
    head.append(title);
    if (group.unit) { const unit = document.createElement('span'); unit.className = 'unit-chip'; unit.textContent = group.unit; head.append(unit); }

    const table = document.createElement('div'); table.className = 'series-table';
    const multi = group.columns.length > 1;
    table.classList.toggle('single', !multi);
    const header = document.createElement('div'); header.className = 'series-row series-labels';
    if (multi) cell(header, '');
    for (const name of ['AT CURSOR', 'MIN', 'MAX', 'MEAN']) cell(header, name);
    table.append(header);

    let reduced = false, crossesZero = false;
    const traces = group.drawn.map(column => {
      const samples = plotSamples(x, data.values[column]);
      const stats = seriesStats(data.values[column]);
      const index = group.columns.indexOf(column);
      const color = multi ? colors.palette[index % colors.palette.length] : colors.ink;
      reduced ||= samples.x.length < x.length;
      crossesZero ||= stats.min < 0 && stats.max > 0;
      const label = multi ? describeColumn(column).component || column : column;

      const row = document.createElement('div'); row.className = 'series-row';
      if (multi) {
        const name = cell(row, label, 'series-name');
        const swatch = document.createElement('i'); swatch.style.background = color;
        name.prepend(swatch);
      }
      const cursor = cell(row, '—', 'series-cursor');
      cell(row, compact(stats.min)); cell(row, compact(stats.max)); cell(row, compact(stats.mean));
      row.title = column;
      table.append(row);
      panel!.series.push({ column, label, color, x: samples.x, y: samples.y, cell: cursor });

      return {
        type: 'scatter' as const, mode: (markers.checked ? 'lines+markers' : 'lines') as 'lines' | 'lines+markers',
        name: label, x: samples.x, y: samples.y, line: { color, width: 1.6 }, marker: { size: 3, color },
        connectgaps: false, hovertemplate: '%{y:.6g}<extra></extra>',
      };
    });

    if (reduced) { const chip = document.createElement('span'); chip.className = 'sampled-chip'; chip.textContent = 'sampled'; chip.title = 'Drawn from per-bin extrema. Statistics use every sample.'; head.append(chip); }
    panel.node.append(head, table, panel.chart);
    grid.append(panel.node);

    const plot = await Plotly.react(panel.chart, traces, {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: colors.font, color: colors.muted, size: 10 },
      margin: { t: 6, r: 14, b: 30, l: 56 }, height: 232,
      xaxis: {
        automargin: true, nticks: 5, gridcolor: colors.line, zeroline: false, showspikes: true,
        spikemode: 'across', spikesnap: 'cursor', spikedash: 'dot', spikethickness: 1, spikecolor: colors.accent,
        ...(zoom ? { range: zoom } : { autorange: true }),
      },
      yaxis: { automargin: true, nticks: 5, gridcolor: colors.line, zeroline: crossesZero, zerolinecolor: colors.line },
      shapes, showlegend: false, hovermode: 'x', dragmode: 'zoom',
    }, {
      responsive: true, displaylogo: false, scrollZoom: false, displayModeBar: 'hover',
      modeBarButtons: [['toImage'], ['zoom2d', 'pan2d'], ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d']],
      toImageButtonOptions: { filename: group.label.replace(/[^a-z0-9_-]/gi, '_'), format: 'png', scale: 2, width: 1100, height: 550 },
    });
    if (revision !== current) { Plotly.purge(plot); return; }

    if (panel.plot !== plot) {
      panel.plot = plot;
      plot.on('plotly_relayout', (event: PlotRelayoutEvent) => void syncZoom(plot, event));
      plot.on('plotly_hover', (event: { xvals?: unknown[] }) => {
        const at = Number(event.xvals?.[0]);
        if (!Number.isFinite(at)) return;
        updateCursor(at); mirrorHover(plot, at);
      });
      plot.on('plotly_unhover', () => { updateCursor(null); mirrorHover(plot, null); });
      panel.node.addEventListener('pointerenter', () => panel!.node.classList.add('active'));
      panel.node.addEventListener('pointerleave', () => panel!.node.classList.remove('active'));
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  if (revision !== current) return;
  await renderOverview(x, chosen, groups, colors, events, eventSource);
  renderStatus.textContent = '';
}

/* One band for the whole run: each quantity is scaled to its own range, so the strip shows
   where things happen rather than how large they are. The slider sets the range on every chart. */
async function renderOverview(
  x: number[], chosen: string[],
  groups: { key: string; columns: string[]; drawn: string[] }[],
  colors: ReturnType<typeof theme>,
  events: { time: number; label: string }[], eventSource: string[],
) {
  overviewStrip.hidden = !chosen.length;
  if (!chosen.length) { Plotly.purge(overviewChart); overviewPlot = undefined; return; }
  const traces = groups.flatMap(group => group.drawn.map(column => {
    const samples = plotSamples(x, data.values[column], 1200);
    const stats = seriesStats(data.values[column]);
    const span = stats.max - stats.min;
    const multi = group.columns.length > 1;
    const color = multi ? colors.palette[group.columns.indexOf(column) % colors.palette.length] : colors.muted;
    return {
      type: 'scatter' as const, mode: 'lines' as const, name: column, x: samples.x,
      y: samples.y.map(v => v === null ? null : span ? (v - stats.min) / span : .5),
      line: { color, width: 1 }, opacity: .34, connectgaps: false, hoverinfo: 'skip' as const,
    };
  }));
  get('overview-note').textContent = [
    `Whole run over ${timeColumn}, each quantity scaled to its own range.`,
    'Drag to set the time range on every chart.',
    events.length ? `Dotted rules mark ${eventSource.join(' and ')} changes.` : '',
  ].filter(Boolean).join(' ');
  const plot = await Plotly.react(overviewChart, traces, {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: colors.font, color: colors.muted, size: 10 },
    margin: { t: 14, r: 14, b: 22, l: 56 }, height: 122,
    xaxis: { nticks: 8, gridcolor: colors.line, zeroline: false, rangeslider: { visible: true, thickness: .62, bgcolor: 'rgba(0,0,0,0)', bordercolor: colors.line, borderwidth: 1 }, ...(zoom ? { range: zoom } : { autorange: true }) },
    yaxis: { visible: false, fixedrange: true, range: [-.06, 1.06] },
    shapes: eventShapes(events, colors),
    annotations: events.map(event => ({ x: event.time, y: 1.04, yref: 'paper' as const, text: event.label, showarrow: false, font: { size: 9, color: colors.muted }, xanchor: 'left' as const, xshift: 3 })),
    showlegend: false, hovermode: false as const, dragmode: 'zoom',
  }, { responsive: true, displaylogo: false, scrollZoom: false, displayModeBar: false });
  if (overviewPlot !== plot) {
    overviewPlot = plot;
    plot.on('plotly_relayout', (event: PlotRelayoutEvent) => void syncZoom(plot, event));
  }
}

async function syncZoom(source: PlotlyHTMLElement, event: PlotRelayoutEvent) {
  if (syncing || !linked.checked) return;
  const e = event as Record<string, unknown>;
  if (e['xaxis.autorange'] !== true && e['xaxis.range[0]'] === undefined && e['xaxis.range'] === undefined) return;
  const range = e['xaxis.range'] as [number, number] | undefined;
  zoom = e['xaxis.autorange'] === true ? undefined : range ?? [Number(e['xaxis.range[0]']), Number(e['xaxis.range[1]'])];
  syncing = true;
  const targets = [...panels.values()].map(p => p.plot).filter((p): p is PlotlyHTMLElement => !!p && p !== source);
  if (overviewPlot && overviewPlot !== source) targets.push(overviewPlot);
  try { await Promise.all(targets.map(p => Plotly.relayout(p, zoom ? { 'xaxis.range': zoom } : { 'xaxis.autorange': true }))); }
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
get<HTMLSelectElement>('plot-columns').addEventListener('change', event => {
  grid.dataset.columns = (event.target as HTMLSelectElement).value;
  panels.forEach(panel => panel.plot && Plotly.Plots.resize(panel.plot));
});
new MutationObserver(scheduleRender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-appearance', 'data-font'] });
export function setVisible(visible: boolean) {
  if (!visible) return;
  requestAnimationFrame(() => {
    panels.forEach(panel => panel.plot && Plotly.Plots.resize(panel.plot));
    if (overviewPlot) Plotly.Plots.resize(overviewPlot);
  });
}
loadDataset(data, 'Synthetic motion demo', true);
