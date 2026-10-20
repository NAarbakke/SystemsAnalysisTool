/** What the shell needs from a mounted view. */
export interface ViewController {
  /** Called whenever the view is shown or hidden, so it can pause rendering and animation. */
  setVisible(visible: boolean): void;
  /** Page title while the view is shown, when it names more than the view (such as the open model). */
  title?(): string;
}

export interface ViewModule {
  /** Fills `container` with the view's markup and wires it up. Called once, on first visit. */
  mount(container: HTMLElement): ViewController | Promise<ViewController>;
}

export interface ViewDefinition {
  id: string;
  label: string;
  title: string;
  load(): Promise<ViewModule>;
}

/** The navigation, in order. Each view's code loads on its first visit; the first entry opens by default. */
export const views: ViewDefinition[] = [
  { id: 'assembly', label: 'Assembly', title: 'Assembly', load: () => import('../views/assembly/main.ts') },
  { id: 'engines', label: 'Engines', title: 'Engines', load: () => import('../views/engines/main.ts') },
  { id: 'flyover', label: 'Flyover', title: 'Earth flyover', load: () => {
    // Cesium finds its workers and assets from this, so it is set before the module loads.
    (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL('./cesium/', document.baseURI).href;
    return import('../views/flyover/main.ts');
  } },
  { id: 'telemetry', label: 'Telemetry', title: 'Telemetry', load: () => import('../views/telemetry/main.ts') },
];
