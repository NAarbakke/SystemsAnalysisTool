import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBookmarks } from '../src/basemap-bookmarks.ts';
const view = { name:'Harbour', source:'offline', position:[6378137,0,0], orientation:[0,-1,0] };
test('stored map views survive a JSON round trip without losing camera precision', () => {
  assert.deepEqual(parseBookmarks(JSON.parse(JSON.stringify([view]))), [view]);
});
test('corrupt persisted map entries cannot supply invalid camera coordinates', () => {
  const bad = [null, {}, {...view,position:[NaN,0,0]}, {...view,position:[0,0,0]}, {...view,orientation:[0,1]}, {...view,name:'x'.repeat(49)}];
  assert.deepEqual(parseBookmarks([...bad,view]), [view]);
  assert.deepEqual(parseBookmarks({}), []);
  assert.equal(parseBookmarks(Array(50).fill(view)).length,30);
});
