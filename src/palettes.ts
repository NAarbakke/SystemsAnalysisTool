/** Migrate old saved tint choices to one of the two supported modes. */
export function resolveMode(value: string): 'light' | 'dark' {
 return ['light', 'ivory', 'burgundy', 'sea-glass', 'graphite', 'slate'].includes(value) ? 'light' : 'dark';
}
