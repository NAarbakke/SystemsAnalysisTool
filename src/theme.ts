import './appearance.css';
import markup from './appearance.html?raw';
import { resolveMode } from './palettes.ts';
const root = document.documentElement;
const fonts = ['editorial', 'modern', 'technical'];
document.querySelector('[data-appearance-host]')!.innerHTML = markup;
document.body.append(document.querySelector('#appearance-menu')!);
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-palette]');
const fontSelect = document.querySelector<HTMLSelectElement>('#appearance-font')!;
const themeTokens=['page','paper','ink','muted','accent','series-secondary','line','glass','field','glow','shadow','on-solid'];
function applyMode(value: string) {
 const mode=resolveMode(value);
 themeTokens.forEach(token=>root.style.removeProperty('--'+token));
 root.dataset.theme = mode;
 root.dataset.appearance = mode;
 document.querySelector('#appearance-name')!.textContent = mode === 'light' ? 'Light' : 'Dark';
 document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = mode === 'light' ? '#f0f2f5' : '#07090c';
 document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === mode)));
}
function chooseMode(value:string){applyMode(value);try{localStorage.setItem('viewer-appearance',root.dataset.appearance!);}catch{}}
function applyFont(value: string) {
 root.dataset.font = fonts.includes(value) ? value : 'technical'; fontSelect.value = root.dataset.font;
}
let mode = root.dataset.theme || 'dark', font = root.dataset.font || 'technical';
try {
 mode = localStorage.getItem('viewer-appearance') || localStorage.getItem('map-appearance') || localStorage.getItem('viewer-theme') || mode;
 font = localStorage.getItem('viewer-font') || font;
} catch {}
chooseMode(mode); applyFont(font);
buttons.forEach(button => button.addEventListener('click', () => {
 chooseMode(button.dataset.palette!);
}));
fontSelect.addEventListener('change', () => {
 applyFont(fontSelect.value);
 try { localStorage.setItem('viewer-font', fontSelect.value); } catch {}
});
window.addEventListener('storage', event => {
 if (event.key === 'viewer-appearance') applyMode(event.newValue || 'dark');
 if (event.key === 'viewer-font') applyFont(event.newValue || 'technical');
});
if (root.dataset.embedded && window.parent !== window) {
 const host = window.parent.document.documentElement;
 const sync = () => {
  applyMode(host.dataset.appearance || 'dark'); applyFont(host.dataset.font || 'technical');
  window.dispatchEvent(new Event('resize'));
 };
 new MutationObserver(sync).observe(host, { attributes:true, attributeFilter:['data-appearance','data-font'] });
 sync();
}

document.addEventListener('toggle', event => {
 const opened = event.target;
 if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
 const section = opened.closest('main, #flyover-view') || document;
 section.querySelectorAll('details[open]').forEach(detail => {
  if (detail !== opened && !detail.contains(opened) && !opened.contains(detail)) detail.removeAttribute('open');
 });
}, true);

import './immersive.css';
