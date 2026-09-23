import test from 'node:test';
import assert from 'node:assert/strict';
import { numericTable, jsonTable, timeValues, defaultTime, plotSamples, demoTable, describeColumn, groupColumns, eventColumns, phaseEvents, seriesStats, MAX_GROUP, PALETTE } from '../src/dashboard/data.ts';

const PALETTE_WIDTH = PALETTE.light.length;

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
test('demo has a phase channel, twelve quantities and valid time', () => {
  const demo = demoTable();
  assert.equal(demo.columns.length, 14);
  assert.equal(timeValues(demo, defaultTime(demo)).at(-1), 60);
  assert.deepEqual(eventColumns(demo), ['flight_phase']);
  assert.deepEqual(phaseEvents(demo, 'time_s', 'flight_phase'), [
    { time: 12, label: '1' }, { time: 30, label: '2' }, { time: 45, label: '3' },
  ]);
});

test('unit suffixes are read off column names without swallowing frame letters', () => {
  const facts = name => { const f = describeColumn(name); return [f.base, f.component, f.unit]; };
  assert.deepEqual(facts('position_x_m'), ['position', 'x', 'm']);
  assert.deepEqual(facts('velocity_x_m_s'), ['velocity', 'x', 'm/s']);
  assert.deepEqual(facts('accel_z_m_s2'), ['accel', 'z', 'm/s²']);
  assert.deepEqual(facts('roll_deg'), ['', 'roll', 'deg']);
  assert.deepEqual(facts('p_deg_s'), ['', 'p', 'deg/s']);
  assert.deepEqual(facts('chamber_pressure_kpa'), ['chamber pressure', '', 'kpa']);
  // A north channel is a component, not newtons, so its siblings still group with it.
  assert.deepEqual(facts('pos_n'), ['pos', 'n', '']);
  assert.equal(describeColumn('pos_n').key, describeColumn('pos_e').key);
});

test('siblings of one vector share a chart; everything else keeps its own', () => {
  const demo = demoTable();
  const groups = groupColumns(demo.columns.filter(c => c !== 'time_s'));
  assert.deepEqual(groups.map(g => [g.label, g.unit, g.columns.length]), [
    ['flight_phase', '', 1], ['Position', 'm', 3], ['Velocity', 'm/s', 3],
    ['Attitude', 'deg', 3], ['Body rates', 'deg/s', 3],
  ]);
  // A hue is keyed to the column's place in the full group, so filtering never repaints survivors.
  const position = groups.find(g => g.label === 'Position');
  assert.equal(position.columns.indexOf('position_z_m'), 2);
  // A chart never needs more hues than the palette carries, so none are ever cycled.
  const frame = groupColumns(['p_n_m', 'p_e_m', 'p_d_m', 'p_u_m']);
  assert.equal(frame.length, 1);
  assert.equal(frame[0].columns.length, MAX_GROUP);
  assert.equal(MAX_GROUP, PALETTE_WIDTH);
  assert.equal(PALETTE.dark.length, PALETTE_WIDTH);
  // Different families of the same base and unit stay separate charts.
  assert.equal(groupColumns(['a_1_m', 'a_2_m', 'a_x_m', 'a_y_m']).length, 2);
});

test('phase channels must be named as such and step between a few integers', () => {
  const rows = n => Array.from({ length: 6 }, (_, i) => [i, n(i)]);
  assert.deepEqual(eventColumns(numericTable(['t', 'mode'], rows(i => i < 3 ? 0 : 1))), ['mode']);
  assert.deepEqual(eventColumns(numericTable(['t', 'mode'], rows(i => i / 3))), []);
  assert.deepEqual(eventColumns(numericTable(['t', 'thrust'], rows(i => i < 3 ? 0 : 1))), []);
  assert.deepEqual(eventColumns(numericTable(['t', 'mode'], rows(() => 1))), []);
});

test('statistics ignore gaps and report the full-sample mean', () => {
  assert.deepEqual(seriesStats([2, null, 4, 6]), { min: 2, max: 6, mean: 4, count: 3 });
});
