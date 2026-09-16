export interface MapBookmark { name: string; source: string; position: [number, number, number]; orientation: [number, number, number] }
export function parseBookmarks(value: unknown): MapBookmark[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is MapBookmark => {
    if (!v || typeof v !== 'object' || typeof v.name !== 'string' || !v.name.trim() || v.name.length > 48 || typeof v.source !== 'string') return false;
    const triple = (a: unknown) => Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number' && Number.isFinite(n));
    return triple(v.position) && triple(v.orientation) && Math.hypot(...v.position) > 1 && Math.hypot(...v.position) < 1e10;
  }).slice(0, 30);
}
