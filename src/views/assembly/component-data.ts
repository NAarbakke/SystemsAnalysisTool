export interface ComponentInfo { partNumber?: string; material?: string; role?: string; massKg?: number; finish?: string; source?: string }
export interface ComponentReading { label: string; value: number; unit: string }
export interface ComponentStage { id: string; label: string; readings: ComponentReading[] }
const shortText = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 160) : '';
export function readComponentInfo(value: unknown): ComponentInfo {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const info: ComponentInfo = {};
  for (const key of ['partNumber','material','role','finish','source'] as const) { const text = shortText(source[key]); if (text) info[key] = text; }
  if (typeof source.massKg === 'number' && Number.isFinite(source.massKg) && source.massKg >= 0) info.massKg = source.massKg;
  return info;
}
export function readComponentStages(value: unknown): ComponentStage[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 50).flatMap(stage => {
    if (!stage || typeof stage !== 'object') return [];
    const id = shortText(stage.id), label = shortText(stage.label);
    if (!id || !label || ids.has(id) || !Array.isArray(stage.readings)) return [];
    const readings = stage.readings.slice(0, 30).flatMap((r: unknown) => {
      if (!r || typeof r !== 'object') return [];
      const reading = r as Record<string, unknown>;
      const label = shortText(reading.label), unit = shortText(reading.unit);
      return label && typeof reading.value === 'number' && Number.isFinite(reading.value) ? [{label,unit,value:reading.value}] : [];
    });
    ids.add(id); return [{id,label,readings}];
  });
}
