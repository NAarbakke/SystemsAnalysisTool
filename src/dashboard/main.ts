import './style.css';
import uPlot from 'uplot';
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
const CHART_HEIGHT = 220, OVERVIEW_HEIGHT = 96, SYNC_KEY = 'telemetry';
let overviewPlot: uPlot | undefined;
let data: Dataset = demoTable();
let selected = new Set<string>();
let timeColumn = defaultTime(data);
let revision = 0;
let syncing = false;
let zoom: [number, number] | undefined;
let worker: Worker | undefined;
let importing = 0;

type Series = { column: string; label: string; color: string; x: number[]; y: (number | null)[]; cell: HTMLElement };
type Panel = { key: string; node: HTMLElement; chart: HTMLDivElement; plot?: uPlot; series: Series[] };
const panels = new Map<string, Panel>();

// uPlot takes explicit sizes; a hidden view reports zero width and is skipped until shown again.
const plotsByChart = new WeakMap<Element, uPlot>();
const resizer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const plot = plotsByChart.get(entry.target), width = Math.floor(entry.contentRect.width);
    if (plot && width > 0 && width !== plot.width) plot.setSize({ width, height: plot.height });
  }
});
function mount(chart: HTMLElement, plot: uPlot) { plotsByChart.set(chart, plot); resizer.observe(chart); }
function unmount(chart: HTMLElement, plot?: uPlot) { resizer.unobserve(chart); plot?.destroy(); }

function message(text: string, error = false) {
  status.textContent = text; status.classList.toggle('invalid', error);
}
function listQuantities() {
  const query = get<HTMLInputElement>('quantity-search').value.trim().toLowerCase();
  const list = get<HTMLDivElement>('quantity-list');
  list.replaceChildren();
  const quantities = data.columns.filter(c => c !== timeColumn);
  for (const column of quantities.filter(c => c.toLowerCase().includes(query))) {
    const label = document.createElement('label'); label.className = 'check';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(column);
    const name = document.createElement('span'); name.textContent = column;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(column); else selected.delete(column);
      updateCount(); scheduleRender();
    });
    label.append(checkbox, name); list.append(label);
  }
  if (!list.childElementCount) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'No matching quantities.'; list.append(p); }
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
  for (const panel of panels.values()) { unmount(panel.chart, panel.plot); panel.node.remove(); }
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
function scheduleRender() { clearTimeout(renderTimer); revision++; renderTimer = setTimeout(renderPlots, 100); }

function theme() {
  const style = getComputedStyle(document.documentElement);
  const read = (token: string) => style.getPropertyValue(token).trim();
  const dark = document.documentElement.dataset.theme !== 'light';
  return {
    ink: read('--ink'), muted: read('--muted'), line: read('--line'), accent: read('--accent'), hot: read('--hot'), paper: read('--paper'),
    mono: read('--font-mono') || 'monospace', sans: read('--font-sans') || 'sans-serif',
    palette: dark ? PALETTE.dark : PALETTE.light,
  };
}
type Colors = ReturnType<typeof theme>;

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

function axis(colors: Colors, extra: uPlot.Axis = {}): uPlot.Axis {
  return {
    stroke: colors.muted, font: `11px ${colors.mono}`, gap: 4, size: 50,
    grid: { show: false }, ticks: { stroke: colors.line, width: 1, size: 4 },
    values: (_, splits) => splits.map(compact), ...extra,
  };
}

/** Phase changes are drawn as dotted rules in the warm colour, labelled on the overview. */
function eventPlugin(events: { time: number; label: string }[], colors: Colors, labels: boolean): uPlot.Plugin {
  return { hooks: { draw: [u => {
    if (!events.length) return;
    const { ctx, bbox } = u, ratio = devicePixelRatio;
    ctx.save();
    ctx.strokeStyle = colors.hot; ctx.globalAlpha = .7; ctx.lineWidth = ratio; ctx.setLineDash([2 * ratio, 4 * ratio]);
    ctx.fillStyle = colors.hot; ctx.font = `${10 * ratio}px ${colors.mono}`; ctx.textBaseline = 'top';
    for (const event of events) {
      const left = Math.round(u.valToPos(event.time, 'x', true));
      if (left < bbox.left || left > bbox.left + bbox.width) continue;
      ctx.beginPath(); ctx.moveTo(left, bbox.top); ctx.lineTo(left, bbox.top + bbox.height); ctx.stroke();
      if (labels) ctx.fillText(event.label, left + 3 * ratio, bbox.top + 2 * ratio);
    }
    ctx.restore();
  }] } };
}

function fullRange(plot: uPlot): [number, number] {
  const x = plot.data[0];
  return [x[0], x[x.length - 1]];
}

/** One time range for every chart; the overview shades what lies outside it. */
function applyZoom(next: [number, number] | undefined, source?: uPlot) {
  zoom = next;
  syncing = true;
  try {
    for (const panel of panels.values()) {
      if (!panel.plot || panel.plot === source) continue;
      const [min, max] = zoom ?? fullRange(panel.plot);
      panel.plot.setScale('x', { min, max });
    }
  } finally { syncing = false; }
  overviewPlot?.redraw(false);
}

function onChartScale(plot: uPlot, key: string) {
  if (key !== 'x' || syncing || plot.status !== 1 || !linked.checked) return;
  const { min, max } = plot.scales.x, [first, last] = fullRange(plot);
  applyZoom(min! <= first && max! >= last ? undefined : [min!, max!], plot);
}

function exportPng(panel: Panel, title: string, colors: Colors) {
  const plot = panel.plot; if (!plot) return;
  const source = plot.ctx.canvas, ratio = devicePixelRatio, header = 44 * ratio;
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height + header;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.ink; ctx.font = `500 ${14 * ratio}px ${colors.sans}`; ctx.textBaseline = 'middle';
  ctx.fillText(title, 12 * ratio, 16 * ratio);
  ctx.font = `${11 * ratio}px ${colors.mono}`;
  let left = 12 * ratio;
  for (const series of panel.series) {
    ctx.fillStyle = series.color; ctx.fillRect(left, 33 * ratio, 10 * ratio, 2 * ratio);
    ctx.fillStyle = colors.muted; ctx.fillText(series.label, left + 14 * ratio, 34 * ratio);
    left += (ctx.measureText(series.label).width + 30 * ratio);
  }
  ctx.drawImage(source, 0, header);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png'); link.download = `${title.replace(/[^a-z0-9_-]/gi, '_')}.png`; link.click();
}

function renderPlots() {
  const current = revision;
  get('empty-selection').hidden = selected.size > 0;
  let x: number[];
  try { x = timeValues(data, timeColumn); }
  catch (error) { renderStatus.textContent = (error as Error).message; renderStatus.classList.add('invalid'); return; }
  renderStatus.classList.remove('invalid');

  const chosen = data.columns.filter(c => selected.has(c) && c !== timeColumn);
  const colors = theme();
  const eventSource = eventColumns(data).filter(c => c !== timeColumn);
  const events = eventSource.flatMap(c => phaseEvents(data, timeColumn, c));

  // Grouping is computed over every quantity, so a hue follows its column through any filter.
  const groups = groupColumns(data.columns.filter(c => c !== timeColumn))
    .map(group => ({ ...group, drawn: group.columns.filter(c => chosen.includes(c)) }))
    .filter(group => group.drawn.length);

  for (const [key, panel] of panels) {
    if (groups.some(group => group.key === key)) continue;
    unmount(panel.chart, panel.plot);
    panel.node.remove(); panels.delete(key);
  }

  for (const group of groups) {
    if (revision !== current) return;
    let panel = panels.get(group.key);
    if (!panel) {
      const node = document.createElement('article'); node.className = 'plot-panel';
      const chart = document.createElement('div'); chart.className = 'chart';
      panel = { key: group.key, node, chart, series: [] };
      panels.set(group.key, panel);
    }
    unmount(panel.chart, panel.plot); panel.plot = undefined;
    panel.chart.replaceChildren();
    panel.node.replaceChildren();
    panel.series = [];

    const head = document.createElement('div'); head.className = 'panel-head';
    const title = document.createElement('h3'); title.textContent = group.label;
    head.append(title);
    if (group.unit) { const unit = document.createElement('span'); unit.className = 'chip'; unit.textContent = group.unit; head.append(unit); }

    const table = document.createElement('div'); table.className = 'series-table';
    const multi = group.columns.length > 1;
    table.classList.toggle('single', !multi);
    const header = document.createElement('div'); header.className = 'series-row series-labels';
    if (multi) cell(header, '');
    cell(header, 'AT CURSOR');
    table.append(header);

    let reduced = false;
    const tables: uPlot.AlignedData[] = [];
    const seriesOptions: uPlot.Series[] = [{}];
    for (const column of group.drawn) {
      const samples = plotSamples(x, data.values[column]);
      const color = multi ? colors.palette[group.columns.indexOf(column) % colors.palette.length] : colors.accent;
      reduced ||= samples.x.length < x.length;
      const label = multi ? describeColumn(column).component || column : column;

      const row = document.createElement('div'); row.className = 'series-row';
      if (multi) {
        const name = cell(row, label, 'series-name');
        const swatch = document.createElement('i'); swatch.style.background = color;
        name.prepend(swatch);
      }
      const cursor = cell(row, '—', 'series-cursor');
      row.title = column;
      table.append(row);
      panel.series.push({ column, label, color, x: samples.x, y: samples.y, cell: cursor });
      tables.push([samples.x, samples.y]);
      seriesOptions.push({ label, stroke: color, width: 1.5, spanGaps: false, points: { show: markers.checked, size: 4, fill: color, stroke: color } });
    }

    if (reduced) { const chip = document.createElement('span'); chip.className = 'chip sampled-chip'; chip.textContent = 'sampled'; chip.title = 'Drawn from per-bin extrema.'; head.append(chip); }
    const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'export-png'; exportButton.textContent = 'PNG';
    exportButton.title = 'Save this chart as a PNG image';
    const target = panel;
    exportButton.addEventListener('click', () => exportPng(target, group.unit ? `${group.label} [${group.unit}]` : group.label, theme()));
    head.append(exportButton);
    panel.node.append(head, table, panel.chart);
    grid.append(panel.node);

    // Downsampled series keep their own sample times; join aligns them and leaves real gaps as gaps.
    const aligned = tables.length === 1 ? tables[0] : uPlot.join(tables);
    const plot = new uPlot({
      width: Math.max(200, panel.chart.clientWidth), height: CHART_HEIGHT,
      legend: { show: false },
      scales: { x: { time: false, ...(zoom ? { min: zoom[0], max: zoom[1] } : {}) } },
      axes: [axis(colors, { size: 32 }), axis(colors)],
      series: seriesOptions,
      cursor: { sync: { key: SYNC_KEY }, y: false, drag: { x: true, y: false }, points: { size: 7 } },
      plugins: [eventPlugin(events, colors, false)],
      hooks: {
        setCursor: [u => updateCursor(u.cursor.idx == null ? null : u.data[0][u.cursor.idx])],
        setScale: [onChartScale],
      },
    }, aligned, panel.chart);
    panel.plot = plot;
    mount(panel.chart, plot);
  }

  if (revision !== current) return;
  renderOverview(x, chosen, groups, colors, events, eventSource);
  renderStatus.textContent = '';
}

/* One band for the whole run: each quantity is scaled to its own range, so the strip shows
   where things happen rather than how large they are. Dragging sets the range on every chart. */
function renderOverview(
  x: number[], chosen: string[],
  groups: { key: string; columns: string[]; drawn: string[] }[],
  colors: Colors,
  events: { time: number; label: string }[], eventSource: string[],
) {
  if (overviewPlot) { unmount(overviewChart, overviewPlot); overviewPlot = undefined; }
  overviewStrip.hidden = !chosen.length;
  if (!chosen.length) return;
  const tables: uPlot.AlignedData[] = [];
  const series: uPlot.Series[] = [{}];
  for (const group of groups) for (const column of group.drawn) {
    const samples = plotSamples(x, data.values[column], 1200);
    const stats = seriesStats(data.values[column]);
    const span = stats.max - stats.min;
    const multi = group.columns.length > 1;
    const color = multi ? colors.palette[group.columns.indexOf(column) % colors.palette.length] : colors.muted;
    tables.push([samples.x, samples.y.map(v => v === null ? null : span ? (v - stats.min) / span : .5)]);
    series.push({ stroke: color, width: 1, alpha: .45, spanGaps: false, points: { show: false } });
  }
  get('overview-note').textContent = [
    `Whole run over ${timeColumn}, each quantity scaled to its own range.`,
    'Drag to set the time range on every chart; double-click to reset.',
    events.length ? `Dotted rules mark ${eventSource.join(' and ')} changes.` : '',
  ].filter(Boolean).join(' ');

  const shadeOutsideZoom: uPlot.Plugin = { hooks: { draw: [u => {
    if (!zoom) return;
    const { ctx, bbox } = u, ratio = devicePixelRatio;
    const from = Math.max(bbox.left, u.valToPos(zoom[0], 'x', true)), to = Math.min(bbox.left + bbox.width, u.valToPos(zoom[1], 'x', true));
    ctx.save();
    ctx.fillStyle = colors.line;
    ctx.fillRect(bbox.left, bbox.top, from - bbox.left, bbox.height);
    ctx.fillRect(to, bbox.top, bbox.left + bbox.width - to, bbox.height);
    ctx.strokeStyle = colors.accent; ctx.lineWidth = ratio;
    ctx.strokeRect(from, bbox.top + ratio / 2, to - from, bbox.height - ratio);
    ctx.restore();
  }] } };

  const plot = new uPlot({
    width: Math.max(200, overviewChart.clientWidth), height: OVERVIEW_HEIGHT,
    legend: { show: false },
    scales: { x: { time: false }, y: { range: [-.06, 1.06] } },
    axes: [axis(colors, { size: 24 }), { show: false }],
    series,
    cursor: { x: false, y: false, points: { show: false }, drag: { x: true, y: false, setScale: false } },
    plugins: [eventPlugin(events, colors, true), shadeOutsideZoom],
    hooks: { setSelect: [u => {
      if (u.select.width < 3) return;
      const range: [number, number] = [u.posToVal(u.select.left, 'x'), u.posToVal(u.select.left + u.select.width, 'x')];
      u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
      applyZoom(range);
    }] },
  }, tables.length === 1 ? tables[0] : uPlot.join(tables), overviewChart);
  plot.over.addEventListener('dblclick', () => applyZoom(undefined));
  overviewPlot = plot;
  mount(overviewChart, plot);
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
get('reset-zoom').addEventListener('click', () => applyZoom(undefined));
get<HTMLSelectElement>('plot-columns').addEventListener('change', event => {
  grid.dataset.columns = (event.target as HTMLSelectElement).value;
});
// Canvas colours are read from the tokens, so a theme change redraws.
new MutationObserver(scheduleRender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
loadDataset(data, 'Synthetic motion demo', true);
