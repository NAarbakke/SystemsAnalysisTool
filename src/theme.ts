import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/tokens.css';
import './styles/base.css';

const root = document.documentElement;
const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!;

// Older builds saved tint names; the light ones map to light, everything else to dark.
const LIGHT = ['light', 'ivory', 'burgundy', 'sea-glass', 'graphite', 'slate'];

function applyMode(value: string) {
  const mode = LIGHT.includes(value) ? 'light' : 'dark';
  root.dataset.theme = mode;
  document.querySelector('#theme-name')!.textContent = mode === 'light' ? 'Light' : 'Dark';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = mode === 'light' ? '#eef2f6' : '#000000';
}

let saved = 'dark';
try { saved = localStorage.getItem('viewer-appearance') || localStorage.getItem('viewer-theme') || saved; } catch {}
applyMode(saved);
toggle.addEventListener('click', () => {
  applyMode(root.dataset.theme === 'light' ? 'dark' : 'light');
  try { localStorage.setItem('viewer-appearance', root.dataset.theme!); } catch {}
});
window.addEventListener('storage', event => { if (event.key === 'viewer-appearance') applyMode(event.newValue || 'dark'); });

// Only one disclosure per view stays open, so a panel never grows past the screen.
document.addEventListener('toggle', event => {
  const opened = event.target;
  if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
  const section = opened.closest('main, section, aside') || document;
  section.querySelectorAll('details[open]').forEach(detail => {
    if (detail !== opened && !detail.contains(opened) && !opened.contains(detail)) detail.removeAttribute('open');
  });
}, true);
