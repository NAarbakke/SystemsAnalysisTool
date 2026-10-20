export interface MapSource {
  id: string; name: string; description: string;
  type: 'xyz' | 'arcgis' | 'ion'; network: 'online' | 'intranet';
  url?: string; maximumLevel?: number; tileSize?: number;
  projection?: 'geographic' | 'mercator'; credit?: string; creditUrl?: string;
  bounds?: [number, number, number, number]; assetId?: number; accessToken?: string;
}
export interface MapConfig { allowOnline: boolean; defaultSource: string; sources: MapSource[] }

/** Configuration is managed by the local site administrator, not imported flight data. */
export function parseMapConfig(input: unknown): MapConfig {
  if (!input || typeof input !== 'object') throw new Error('Map configuration must be an object.');
  const config = input as MapConfig;
  if (typeof config.allowOnline !== 'boolean' || !Array.isArray(config.sources) || !config.sources.length) throw new Error('Map configuration needs allowOnline and a nonempty sources array.');
  const ids = new Set<string>();
  for (const source of config.sources) {
    if (!source || typeof source !== 'object' || typeof source.id !== 'string' || !/^[a-z0-9-]+$/.test(source.id) || ids.has(source.id)) throw new Error('Each map source needs a unique lowercase id.');
    ids.add(source.id);
    for (const key of ['name', 'description'] as const) if (typeof source[key] !== 'string' || !source[key].trim()) throw new Error(`${source.id}: ${key} is required.`);
    if (!['xyz', 'arcgis', 'ion'].includes(source.type) || !['online', 'intranet'].includes(source.network)) throw new Error(`${source.id}: unsupported source type or network.`);
    if (source.type === 'ion') {
      if (!Number.isSafeInteger(source.assetId) || source.assetId! <= 0 || typeof source.accessToken !== 'string' || !source.accessToken.trim() || source.network !== 'online') throw new Error(`${source.id}: ion requires an asset id, read-only access token and online access.`);
    } else {
      if (typeof source.url !== 'string' || !source.url.trim()) throw new Error(`${source.id}: URL required.`);
      const url = new URL(source.url, 'https://local.invalid/');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`${source.id}: use an HTTP(S) or relative URL without embedded credentials.`);
      if (source.type === 'xyz' && (!source.url.includes('{z}') || !source.url.includes('{x}') || !/\{(?:y|reverseY)\}/.test(source.url))) throw new Error(`${source.id}: tile URL needs {z}, {x} and {y} (or {reverseY}).`);
    }
    if (source.type === 'xyz' && (!Number.isInteger(source.maximumLevel) || source.maximumLevel! < 0 || source.maximumLevel! > 24)) throw new Error(`${source.id}: maximumLevel must be 0–24.`);
    if (source.projection && !['geographic', 'mercator'].includes(source.projection)) throw new Error(`${source.id}: invalid projection.`);
    if (source.tileSize !== undefined && ![256, 512, 1024].includes(source.tileSize)) throw new Error(`${source.id}: tileSize must be 256, 512 or 1024.`);
    if (source.bounds !== undefined) {
      const b = source.bounds;
      if (!Array.isArray(b) || b.length !== 4 || !b.every(Number.isFinite) || b[0] < -180 || b[2] > 180 || b[1] < -90 || b[3] > 90 || b[0] >= b[2] || b[1] >= b[3]) throw new Error(`${source.id}: bounds must be west,south,east,north degrees without crossing the antimeridian.`);
    }
    if (source.creditUrl && !/^https?:\/\//.test(source.creditUrl)) throw new Error(`${source.id}: creditUrl must use HTTP(S).`);
  }
  const sources = config.sources.filter(source => config.allowOnline || source.network === 'intranet');
  if (!sources.length) throw new Error('No map sources are available under the configured network policy.');
  return { allowOnline: config.allowOnline, sources, defaultSource: sources.some(s => s.id === config.defaultSource) ? config.defaultSource : sources[0].id };
}
