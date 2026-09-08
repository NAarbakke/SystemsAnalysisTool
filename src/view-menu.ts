export function setupViewMenu(onAssemblyVisible: (visible: boolean) => void) {
  const assembly = document.querySelector<HTMLElement>('#assembly-view')!;
  const globe = document.querySelector<HTMLElement>('#flyover-view')!;
  const signals = document.querySelector<HTMLElement>('#signals-view')!;
  const assemblyButton = document.querySelector<HTMLButtonElement>('#assembly-mode')!;
  const flyoverButton = document.querySelector<HTMLButtonElement>('#flyover-mode')!;
  const signalsButton = document.querySelector<HTMLButtonElement>('#signals-mode')!;
  let flyover: Awaited<ReturnType<typeof import('./flyover.ts')['createFlyover']>> | undefined;
  let dashboard: typeof import('./dashboard/main.ts') | undefined;
  let globeLoading: Promise<void> | undefined;
  let signalsLoading: Promise<void> | undefined;
  let active: 'assembly' | 'flyover' | 'signals' = 'assembly';
  function activate(view: typeof active) {
    active = view;
    assembly.hidden = view !== 'assembly'; globe.hidden = view !== 'flyover'; signals.hidden = view !== 'signals';
    for (const [button, name] of [[assemblyButton, 'assembly'], [flyoverButton, 'flyover'], [signalsButton, 'signals']] as const) button.setAttribute('aria-pressed', String(view === name));
    document.title = view === 'signals' ? 'Signal Studio — SystemsAnalysisTool' : view === 'flyover' ? 'Earth flyover — SystemsAnalysisTool' : `${assembly.querySelector('h1')!.textContent} — SystemsAnalysisTool`;
    flyover?.setVisible(view === 'flyover'); dashboard?.setVisible(view === 'signals');
    onAssemblyVisible(view === 'assembly');
  }
  assemblyButton.addEventListener('click', () => activate('assembly'));
  flyoverButton.addEventListener('click', async () => {
    activate('flyover');
    if (!flyover && !globeLoading) {
      globeLoading = (async () => {
        try {
          (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL('./cesium/', document.baseURI).href;
          const { createFlyover } = await import('./flyover.ts');
          flyover = await createFlyover(); flyover.setVisible(active === 'flyover');
        } catch (cause) {
          console.error(cause);
          document.querySelector('#flight-message')!.textContent = 'Could not load the globe. Check WebGL support and the local globe assets, then try Flyover again.';
        } finally { globeLoading = undefined; }
      })();
    }
    await globeLoading; flyover?.setVisible(active === 'flyover');
  });
  signalsButton.addEventListener('click', async () => {
    activate('signals');
    if (!dashboard && !signalsLoading) {
      signals.textContent = 'Loading Signal Studio…';
      signalsLoading = (async () => {
        try {
          const { default: markup } = await import('./dashboard/view.html?raw');
          signals.innerHTML = markup;
          dashboard = await import('./dashboard/main.ts');
          dashboard.setVisible(active === 'signals');
        } catch (cause) {
          console.error(cause);
          signals.textContent = 'Could not load Signal Studio. Reload the page to retry.';
        } finally { signalsLoading = undefined; }
      })();
    }
    await signalsLoading;
  });
  if (new URLSearchParams(location.search).get('view') === 'signals') signalsButton.click();
}
