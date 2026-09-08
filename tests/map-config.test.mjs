import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMapConfig } from '../src/maps/config.ts';

const defaults = JSON.parse(await readFile(new URL('../static/data/maps/sources.json', import.meta.url), 'utf8'));
test('published map sources include a detailed satellite, streets and offline fallback', () => {
  const config = parseMapConfig(defaults);
  assert.equal(config.defaultSource, 'satellite');
  assert.deepEqual(config.sources.map(s => s.type), ['arcgis', 'xyz', 'xyz']);
  assert.equal(config.sources[1].maximumLevel, 19);
});
test('disconnected configuration removes online providers and online default', () => {
  const config = parseMapConfig({ ...defaults, allowOnline: false });
  assert.equal(config.defaultSource, 'offline');
  assert.deepEqual(config.sources.map(s => s.id), ['offline']);
});
test('bad tile endpoints, duplicate ids, extents and empty offline configuration fail explicitly', () => {
  const source = defaults.sources[1];
  const single = changes => ({ allowOnline: true, defaultSource: 'streets', sources: [{ ...source, ...changes }] });
  for (const changes of [{ url: 'file:///tiles/{z}/{x}/{y}' }, { url: 'https://tiles.test/missing' }, { maximumLevel: 99 }, { bounds: [10, 60, 9, 61] }, { tileSize: 100 }, { creditUrl: 'javascript:alert(1)' }]) assert.throws(() => parseMapConfig(single(changes)));
  assert.throws(() => parseMapConfig({ ...defaults, sources: [source, source] }));
  assert.throws(() => parseMapConfig({ ...single({}), allowOnline: false }));
});
test('regional TMS and licensed ion sources can be configured', () => {
  const local = { ...defaults.sources[1], id: 'regional', network: 'intranet', url: './ortho/{z}/{x}/{reverseY}.jpg', bounds: [5, 58, 12, 63] };
  const ion = { id: 'premium', name: 'Licensed map', description: 'Licensed imagery', network: 'online', type: 'ion', assetId: 123, accessToken: 'test-read-only-token' };
  assert.equal(parseMapConfig({ allowOnline: true, defaultSource: 'premium', sources: [local, ion] }).sources.length, 2);
  assert.throws(() => parseMapConfig({ allowOnline: true, sources: [{ ...ion, network: 'intranet' }] }));
});
