import './appearance.css';
import markup from './appearance.html?raw';

const palettes = {
  obsidian: { name: 'Obsidian', background: '#111315' },
  midnight: { name: 'Midnight', background: '#0c1220' },
  aurora: { name: 'Aurora', background: '#0c1715' },
  ember: { name: 'Ember', background: '#1a1112' },
  ivory: { name: 'Ivory', background: '#eeede8' },
} as const;
type Palette = keyof typeof palettes;
const fonts = ['editorial', 'modern', 'system', 'technical'];
const root = document.documentElement;
document.querySelector('[data-appearance-host]')!.innerHTML = markup;
// Put the popover outside navigation containers so it never inherits their layout.
document.body.append(document.querySelector('#appearance-menu')!);
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-palette]');
const fontSelect = document.querySelector<HTMLSelectElement>('#appearance-font')!;

function applyPalette(palette: Palette) {
  root.dataset.appearance = palette;
  root.dataset.mapTheme = palette;
  root.dataset.theme = palette === 'ivory' ? 'light' : 'dark';
  document.querySelector('#appearance-name')!.textContent = palettes[palette].name;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = palettes[palette].background;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === palette)));
}
function applyFont(font: string) {
  root.dataset.font = fonts.includes(font) ? font : 'editorial';
  fontSelect.value = root.dataset.font;
}
let initialPalette = 'obsidian', initialFont = 'editorial';
try {
  initialPalette = localStorage.getItem('viewer-appearance') || localStorage.getItem('map-appearance') || (localStorage.getItem('viewer-theme') === 'light' ? 'ivory' : 'obsidian');
  initialFont = localStorage.getItem('viewer-font') || 'editorial';
} catch { /* Preferences are optional. */ }
applyPalette(Object.hasOwn(palettes, initialPalette) ? initialPalette as Palette : 'obsidian');
applyFont(initialFont);
buttons.forEach(button => button.addEventListener('click', () => {
  const palette = button.dataset.palette as Palette;
  applyPalette(palette);
  try { localStorage.setItem('viewer-appearance', palette); } catch { /* Preview still works. */ }
}));
fontSelect.addEventListener('change', () => {
  applyFont(fontSelect.value);
  try { localStorage.setItem('viewer-font', fontSelect.value); } catch { /* Preview still works. */ }
});
window.addEventListener('storage', event => {
  if (event.key === 'viewer-appearance' && event.newValue && Object.hasOwn(palettes, event.newValue)) applyPalette(event.newValue as Palette);
  if (event.key === 'viewer-font' && event.newValue) applyFont(event.newValue);
});
