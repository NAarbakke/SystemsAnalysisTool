import test from 'node:test';
import assert from 'node:assert/strict';
import { bracket, nearestIndex } from '../src/core/series.ts';
import { parseTimedCsv } from '../src/core/timed-csv.ts';

test('bracket finds the surrounding samples and clamps outside the series', () => {
  const times = [0, 1, 3, 6];
  const at = t => bracket(times.length, i => times[i], t);
  assert.deepEqual(at(2), { low: 1, high: 2, fraction: .5 });
  assert.deepEqual(at(-5), { low: 0, high: 1, fraction: 0 });
  assert.deepEqual(at(9), { low: 2, high: 3, fraction: 1 });
  assert.deepEqual(bracket(1, () => 4, 2), { low: 0, high: 0, fraction: 0 });
  assert.equal(nearestIndex(times, 2), 1); // a tie goes to the earlier sample
  assert.equal(nearestIndex(times, 2.1), 2);
});

test('timed CSV rebases time, reports line numbers and enforces the shared limits', () => {
  const read = text => parseTimedCsv(text, header => header === 'time,value' ? 2 : undefined, 'Use header time,value.', ([time, value]) => ({ time, value }));
  assert.deepEqual(read('﻿ Time , Value\r\n\n5,1\n7,2\n'), [{ time: 0, value: 1 }, { time: 2, value: 2 }]);
  assert.throws(() => read('t,v\n0,1\n1,2'), /header time,value/);
  assert.throws(() => read('time,value\n0,1'), /2–50,000/);
  assert.throws(() => read('time,value\n0,1\n0,2'), /Line 3: .*increasing/);
  assert.throws(() => read('time,value\n0,1\n1,'), /Line 3: enter 2 finite numbers/);
  assert.throws(() => read('time,value\n0,1\n1,2,3'), /Line 3/);
});
