import { el } from '../core/dom.ts';
import { views, type ViewController, type ViewDefinition } from './views.ts';

export const APP_NAME = 'Systems Analysis Tool';

/**
 * One full-window container and one navigation button per registered view. Only the shown
 * view is visible; each mounts on its first visit and is told when it is hidden again.
 */
export function startShell(nav: HTMLElement) {
  type Entry = { view: ViewDefinition; button: HTMLButtonElement; container: HTMLElement; controller?: Promise<ViewController | undefined> };
  let active: Entry | undefined;

  const entries: Entry[] = views.map(view => {
    const button = el('button', { type: 'button', id: `${view.id}-mode`, textContent: view.label });
    button.setAttribute('aria-pressed', 'false');
    const container = el('main', { id: `${view.id}-view`, hidden: true });
    container.setAttribute('aria-label', view.title);
    button.addEventListener('click', () => void activate(entry));
    nav.append(button); document.body.append(container);
    const entry: Entry = { view, button, container };
    return entry;
  });

  function mount(entry: Entry) {
    entry.container.replaceChildren(el('p', { className: 'note view-status', textContent: `Loading ${entry.view.label}…` }));
    return (async () => {
      try {
        const module = await entry.view.load();
        entry.container.replaceChildren();
        return await module.mount(entry.container);
      } catch (cause) {
        console.error(cause);
        entry.controller = undefined; // the next visit retries
        entry.container.replaceChildren(el('p', { className: 'note view-status', textContent: `Could not load ${entry.view.label}. Reload the page to retry.` }));
        return undefined;
      }
    })();
  }

  async function activate(entry: Entry) {
    const previous = active;
    active = entry;
    for (const other of entries) {
      other.container.hidden = other !== entry;
      other.button.setAttribute('aria-pressed', String(other === entry));
    }
    if (previous && previous !== entry) void previous.controller?.then(controller => controller?.setVisible(false));
    document.title = `${entry.view.title} — ${APP_NAME}`;
    const url = new URL(location.href); url.searchParams.set('view', entry.view.id); history.replaceState(null, '', url);

    entry.controller ??= mount(entry);
    const controller = await entry.controller;
    if (active !== entry || !controller) return;
    controller.setVisible(true);
    const title = controller.title?.();
    if (title) document.title = `${title} — ${APP_NAME}`;
  }

  const requested = new URLSearchParams(location.search).get('view');
  void activate(entries.find(entry => entry.view.id === requested) ?? entries[0]);
}
