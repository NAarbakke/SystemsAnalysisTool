import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseNotamAreas } from '../src/views/flyover/notam/data.ts';

test('bundled NOTAM areas parse as real, sourced shapes over mainland China', async () => {
  const areas = parseNotamAreas(JSON.parse(await readFile(new URL('../static/data/notams.geojson', import.meta.url), 'utf8')));
  assert.equal(areas.length, 19);
  assert.ok(areas.every(area => !area.demo && area.description.includes('Source: FAA NOTAM Search')));
  assert.ok(areas.every(area => area.coordinates.every(([lon, lat]) => lon > 73 && lon < 135 && lat > 18 && lat < 54)));
  assert.equal(areas.find(area => area.id === 'A5708/26').radius, 50000);
  const polygon = areas.find(area => area.id === 'A5707/26');
  assert.deepEqual(polygon.coordinates[0], polygon.coordinates.at(-1));
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
