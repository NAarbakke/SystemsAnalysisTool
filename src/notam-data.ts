export interface NotamArea {
  id: string; title: string; description: string; color: string; demo: boolean;
  coordinates: [number, number][]; radius?: number;
}

export function parseNotamAreas(value: unknown): NotamArea[] {
  const collection = value as { type?: string; features?: unknown[] };
  if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length > 1000) throw new Error('Expected a GeoJSON FeatureCollection with at most 1,000 areas.');
  const ids = new Set<string>();
  return collection.features.map((value, index) => {
    const feature = value as { type?: string; id?: string; properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } };
    const p = feature?.properties, geometry = feature?.geometry;
    if (feature?.type !== 'Feature' || !p || !geometry || !['Polygon', 'Point'].includes(geometry.type ?? '')) throw new Error(`Area ${index + 1}: use Polygon or Point with radius_m.`);
    const id = String(feature.id ?? index);
    if (ids.has(id)) throw new Error(`Duplicate area ID: ${id}`);
    ids.add(id);
    const raw = geometry.type === 'Point' ? [geometry.coordinates] : (geometry.coordinates as unknown[])?.[0];
    if (!Array.isArray(raw) || raw.length > 5000 || raw.length < (geometry.type === 'Point' ? 1 : 4)) throw new Error(`Area ${id}: invalid coordinates.`);
    if (geometry.type === 'Polygon' && (geometry.coordinates as unknown[]).length !== 1) throw new Error(`Area ${id}: polygon holes are not supported.`);
    const coordinates = raw.map(point => {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error(`Area ${id}: use longitude, latitude pairs in degrees.`);
      return point as [number, number];
    });
    if (geometry.type === 'Polygon' && coordinates[0].some((v, i) => v !== coordinates.at(-1)![i])) throw new Error(`Area ${id}: close the polygon ring.`);
    const radius = geometry.type === 'Point' ? Number(p.radius_m) : undefined;
    if (radius !== undefined && (!Number.isFinite(radius) || radius <= 0 || radius > 2_000_000)) throw new Error(`Area ${id}: radius_m must be 0–2,000,000 metres.`);
    return { id, title: String(p.title ?? id), description: String(p.description ?? ''), demo: p.demo === true,
      color: typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#ffb347', coordinates, radius };
  });
}
