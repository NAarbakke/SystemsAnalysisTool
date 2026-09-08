import test from 'node:test';
import assert from 'node:assert/strict';
import { numericTable, jsonTable, timeValues, defaultTime, plotSamples, demoTable } from '../src/dashboard/data.ts';

test('numeric imports preserve gaps, scientific notation, and zero; report text columns', () => {
  const data = numericTable(['time_s', 'value', 'note'], [['0', '0', 'start'], ['0.1', '', ''], ['0.2', '1e-4', 'end']]);
  assert.deepEqual(data.columns, ['time_s', 'value']);
  assert.deepEqual(data.values.value, [0, null, .0001]);
  assert.deepEqual(data.omitted, ['note']);
  assert.equal(defaultTime(data), 'time_s');
  assert.deepEqual(timeValues(data, 'time_s'), [0, .1, .2]);
});
test('table structure errors and duplicate names are rejected', () => {
  assert.throws(() => numericTable(['t', 't'], [[0, 1], [1, 2]]), /unique/);
  assert.throws(() => numericTable(['t', 'x'], [[0, 1], [1]]), /same number/);
  assert.throws(() => numericTable(['t', 'x'], [[0, Infinity], [1, 2]]), /two numeric/);
});
test('duplicate, decreasing, or missing times cannot produce misleading curves', () => {
  for (const times of [[0, 0], [1, 0], [0, null]]) {
    const data = numericTable(['t', 'x'], times.map((t, i) => [t, i]));
    assert.throws(() => timeValues(data, 't'), /strictly increasing/);
  }
});
test('JSON columns and rows agree, including missing values', () => {
  assert.deepEqual(jsonTable('{"t":[0,1,2],"value":[1,null,3]}'), jsonTable('[{"t":0,"value":1},{"t":1},{"t":2,"value":3}]'));
  assert.throws(() => jsonTable('{"t":[0,1],"value":[1]}'), /equal lengths/);
  assert.throws(() => jsonTable('[{"t":0,"x":1},{"t":1,"x":2,"extra":3}]'), /same column/);
});
test('untrusted column names cannot alter object prototypes', () => {
  const data = numericTable(['t', '__proto__'], [[0, 5], [1, 6]]);
  assert.deepEqual(data.values['__proto__'], [5, 6]);
  assert.equal(Object.getPrototypeOf(data.values), null);
});
test('overview retains endpoints, narrow extrema and gaps', () => {
  const x = Array.from({ length: 20000 }, (_, i) => i);
  const y = x.map(() => 0); y[10005] = 999; y[10007] = -400; y[8000] = null;
  const reduced = plotSamples(x, y);
  assert.ok(reduced.x.length <= 5000);
  assert.equal(reduced.x[0], 0); assert.equal(reduced.x.at(-1), 19999);
  assert.ok(reduced.y.includes(999)); assert.ok(reduced.y.includes(-400)); assert.ok(reduced.y.includes(null));
  assert.equal(y.length, 20000);
});
test('demo has twelve quantities and valid time', () => {
  const demo = demoTable();
  assert.equal(demo.columns.length, 13);
  assert.equal(timeValues(demo, defaultTime(demo)).at(-1), 60);
});
