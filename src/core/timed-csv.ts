export const MAX_CSV_CHARS = 5_000_000, MAX_SAMPLES = 50_000;

/** Throws an error naming the CSV line it came from. */
export type Fail = (message: string) => never;

/**
 * Numeric CSV with time in the first column, as simulators export it: a BOM and blank lines
 * are ignored, every row is complete, and time is nonnegative and strictly increasing. The
 * header is passed to `columns` lowercased without spaces; it returns the column count, or
 * undefined to reject the header with `headerError`. Times are rebased to start at zero.
 */
export function parseTimedCsv<T extends { time: number }>(
  text: string,
  columns: (header: string) => number | undefined,
  headerError: string,
  read: (values: number[], fail: Fail) => T,
): T[] {
  if (text.length > MAX_CSV_CHARS) throw new Error('Use a CSV smaller than 5 MB.');
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((line, i) => ({ line: line.trim(), number: i + 1 })).filter(row => row.line);
  const count = columns(lines.shift()?.line.toLowerCase().replace(/\s/g, '') ?? '');
  if (count === undefined) throw new Error(headerError);
  if (lines.length < 2 || lines.length > MAX_SAMPLES) throw new Error('Use 2–50,000 samples.');
  let previous = -Infinity;
  const samples = lines.map(({ line, number }) => {
    const fail: Fail = message => { throw new Error(`Line ${number}: ${message}`); };
    const fields = line.split(',').map(value => value.trim());
    const values = fields.map(Number);
    if (fields.length !== count || fields.some(value => !value) || !values.every(Number.isFinite)) fail(`enter ${count} finite numbers.`);
    if (values[0] < 0 || values[0] <= previous) fail('time must be nonnegative, strictly increasing seconds.');
    previous = values[0];
    return read(values, fail);
  });
  const start = samples[0].time;
  for (const sample of samples) sample.time -= start;
  return samples;
}
