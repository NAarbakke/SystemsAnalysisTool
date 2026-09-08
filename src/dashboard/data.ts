export type Dataset = { columns: string[]; values: Record<string, (number | null)[]>; rows: number; omitted: string[] };
export const MAX_ROWS = 200_000;

export function numericTable(headers: string[], rows: unknown[][]): Dataset {
  if (headers.length < 2 || headers.length > 128) throw new Error('Use 2–128 columns, including time.');
  const columns = headers.map(h => h.trim());
  if (columns.some(h => !h || h.length > 120) || new Set(columns).size !== columns.length) throw new Error('Column names must be unique, nonempty, and no longer than 120 characters.');
  if (rows.length < 2 || rows.length > MAX_ROWS) throw new Error(`Use 2–${MAX_ROWS.toLocaleString()} samples per file.`);
  if (rows.some(row => row.length !== columns.length)) throw new Error('Every row must have the same number of fields as the header.');
  const values: Dataset['values'] = Object.create(null);
  const omitted: string[] = [];
  columns.forEach((column, i) => {
    let numeric = true, count = 0;
    const series = rows.map(row => {
      const raw = row[i];
      if (raw == null || typeof raw === 'string' && raw.trim() === '') return null;
      if (typeof raw !== 'number' && typeof raw !== 'string') { numeric = false; return null; }
      const value = Number(raw);
      if (!Number.isFinite(value)) { numeric = false; return null; }
      count++; return value;
    });
    if (numeric && count) values[column] = series;
    else omitted.push(column);
  });
  const numericColumns = columns.filter(c => Object.hasOwn(values, c));
  if (numericColumns.length < 2) throw new Error('At least two numeric columns are required: time and one quantity.');
  return { columns: numericColumns, values, rows: rows.length, omitted };
}

export function jsonTable(source: string): Dataset {
  const raw = JSON.parse(source);
  if (Array.isArray(raw)) {
    if (!raw.length || raw.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('JSON rows must be objects with named columns.');
    const headers = Object.keys(raw[0]);
    if (raw.some(r => Object.keys(r).some(k => !headers.includes(k)))) throw new Error('JSON rows must use the same column names.');
    return numericTable(headers, raw.map(r => headers.map(h => r[h])));
  }
  if (!raw || typeof raw !== 'object') throw new Error('Use JSON row objects or an object of column arrays.');
  const headers = Object.keys(raw);
  const arrays = headers.map(h => raw[h]);
  if (!arrays.length || arrays.some(a => !Array.isArray(a) || a.length !== arrays[0].length)) throw new Error('JSON column arrays must have equal lengths.');
  return numericTable(headers, arrays[0].map((_: unknown, i: number) => arrays.map(a => a[i])));
}

export function timeValues(data: Dataset, column: string): number[] {
  const values = data.values[column];
  if (!values) throw new Error('Choose an available numeric time column.');
  for (let i = 0; i < values.length; i++) {
    if (values[i] === null || i > 0 && values[i]! <= values[i - 1]!) throw new Error(`“${column}” must be complete and strictly increasing (sample ${i + 1}). Choose the correct time column.`);
  }
  return values as number[];
}

export function defaultTime(data: Dataset): string {
  return data.columns.find(c => /^(time|t)(?:$|[_\s[(])/i.test(c)) ?? data.columns[0];
}

// Per-bin extrema keep short peaks visible. Source samples are never modified.
export function plotSamples(x: number[], y: (number | null)[], limit = 5000) {
  if (x.length <= limit) return { x, y };
  const step = Math.ceil(x.length / Math.floor(limit / 5));
  const indices = new Set<number>([0, x.length - 1]);
  for (let start = 0; start < x.length; start += step) {
    const end = Math.min(x.length, start + step);
    let low = -1, high = -1, gap = -1;
    for (let i = start; i < end; i++) {
      if (y[i] === null) { if (gap < 0) gap = i; continue; }
      if (low < 0 || y[i]! < y[low]!) low = i;
      if (high < 0 || y[i]! > y[high]!) high = i;
    }
    [start, end - 1, low, high, gap].filter(i => i >= 0).forEach(i => indices.add(i));
  }
  const sorted = [...indices].sort((a, b) => a - b);
  return { x: sorted.map(i => x[i]), y: sorted.map(i => y[i]) };
}

export function demoTable(): Dataset {
  const headers = ['time_s', 'position_x_m', 'position_y_m', 'position_z_m', 'velocity_x_m_s', 'velocity_y_m_s', 'velocity_z_m_s', 'roll_deg', 'pitch_deg', 'yaw_deg', 'p_deg_s', 'q_deg_s', 'r_deg_s'];
  const rows = Array.from({ length: 1201 }, (_, i) => {
    const t = i / 20;
    return [t, 2 * Math.sin(t / 6), Math.cos(t / 8), .5 * Math.sin(t / 4), Math.cos(t / 6) / 3, -Math.sin(t / 8) / 8, Math.cos(t / 4) / 8, 8 * Math.sin(t / 5), 4 * Math.cos(t / 7), 12 * Math.sin(t / 9), .6 * Math.sin(t / 3), .3 * Math.cos(t / 4), .8 * Math.sin(t / 7)];
  });
  return numericTable(headers, rows);
}
