import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseNotamAreas } from '../src/notam-data.ts';

test('local demo areas include one circle and one closed polygon near the example route', async () => {
  const areas = parseNotamAreas(JSON.parse(await readFile(new URL('../static/data/notams.geojson', import.meta.url), 'utf8')));
  assert.equal(areas.length, 2);
  assert.ok(areas.every(area => area.demo && area.title.includes('DEMO')));
  assert.equal(areas[0].radius, 140000);
  assert.deepEqual(areas[0].coordinates[0], [-20, 43]);
  assert.deepEqual(areas[1].coordinates[0], areas[1].coordinates.at(-1));
});

test('invalid geographic areas are rejected before rendering', () => {
  const feature = { type: 'Feature', id: 'one', properties: { radius_m: 100 }, geometry: { type: 'Point', coordinates: [181, 0] } };
  const wrap = value => ({ type: 'FeatureCollection', features: value });
  assert.throws(() => parseNotamAreas(wrap([feature])), /longitude/);
  feature.geometry.coordinates = [0, 0];
  assert.throws(() => parseNotamAreas(wrap([feature, feature])), /Duplicate/);
  feature.properties.radius_m = -10;
  assert.throws(() => parseNotamAreas(wrap([feature])), /radius/);
  assert.throws(() => parseNotamAreas(null));
});
