/** Kept apart from the loaders so the always-loaded viewer can check a file without pulling them in. */
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
const IMPORTABLE = /\.(glb|stl|stp|step)$/i;

export function isImportable(name: string) { return IMPORTABLE.test(name); }

/** Display name and format label for an imported file. */
export function describeImport(name: string) {
  const format = (name.match(IMPORTABLE)?.[1] ?? '').toUpperCase().replace('STP', 'STEP');
  return { title: name.replace(IMPORTABLE, ''), format };
}
