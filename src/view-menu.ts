export function setupViewMenu(onAssemblyVisible: (visible: boolean) => void) {
  const assembly = document.querySelector<HTMLElement>('#assembly-view')!;
  const globe = document.querySelector<HTMLElement>('#flyover-view')!;
  const telemetry = document.querySelector<HTMLElement>('#telemetry-view')!;
  const assemblyButton = document.querySelector<HTMLButtonElement>('#assembly-mode')!;
  const flyoverButton = document.querySelector<HTMLButtonElement>('#flyover-mode')!;
  const telemetryButton = document.querySelector<HTMLButtonElement>('#telemetry-mode')!;
  const engines = document.querySelector<HTMLElement>('#engines-view')!;
  const enginesButton = document.querySelector<HTMLButtonElement>('#engines-mode')!;
  const enginesFrame = document.querySelector<HTMLIFrameElement>('#engines-frame')!;
  let flyover: Awaited<ReturnType<typeof import('./flyover.ts')['createFlyover']>> | undefined;
  let dashboard: typeof import('./dashboard/main.ts') | undefined;
  let globeLoading: Promise<void> | undefined;
  let telemetryLoading: Promise<void> | undefined;
  let active: 'assembly' | 'flyover' | 'telemetry' | 'engines' = 'assembly';
  function activate(view: typeof active) {
    active = view;
    assembly.hidden = view !== 'assembly'; globe.hidden = view !== 'flyover'; telemetry.hidden = view !== 'telemetry';
    engines.hidden = view !== 'engines';
    for (const [button, name] of [[assemblyButton, 'assembly'], [flyoverButton, 'flyover'], [telemetryButton, 'telemetry'], [enginesButton, 'engines']] as const) button.setAttribute('aria-pressed', String(view === name));
    document.title = view === 'engines' ? 'Engines - SystemsAnalysisTool' : view === 'telemetry' ? 'Telemetry — SystemsAnalysisTool' : view === 'flyover' ? 'Earth flyover — SystemsAnalysisTool' : `${assembly.querySelector<HTMLSelectElement>('#model-picker')?.selectedOptions[0]?.textContent ?? 'Assembly'} — SystemsAnalysisTool`;
    flyover?.setVisible(view === 'flyover'); dashboard?.setVisible(view === 'telemetry');
    onAssemblyVisible(view === 'assembly');
    enginesFrame.contentWindow?.postMessage({ type:'engine-visibility', visible:view === 'engines' }, location.origin);
    const url = new URL(location.href); url.searchParams.set('view', view); history.replaceState(null, '', url);
  }
  enginesFrame.addEventListener('load', () => enginesFrame.contentWindow?.postMessage({type:'engine-visibility',visible:active === 'engines'},location.origin));
  enginesButton.addEventListener('click', () => {
    activate('engines');
    if (!enginesFrame.hasAttribute('src')) enginesFrame.src = './engines.html?embedded=1';
  });
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
  telemetryButton.addEventListener('click', async () => {
    activate('telemetry');
    if (!dashboard && !telemetryLoading) {
      telemetry.textContent = 'Loading Telemetry…';
      telemetryLoading = (async () => {
        try {
          const { default: markup } = await import('./dashboard/view.html?raw');
          telemetry.innerHTML = markup;
          dashboard = await import('./dashboard/main.ts');
          dashboard.setVisible(active === 'telemetry');
        } catch (cause) {
          console.error(cause);
          telemetry.textContent = 'Could not load Telemetry. Reload the page to retry.';
        } finally { telemetryLoading = undefined; }
      })();
    }
    await telemetryLoading;
  });
  const initialView = new URLSearchParams(location.search).get('view');
  if (initialView === 'telemetry') telemetryButton.click();
  else if (initialView === 'engines') enginesButton.click();
  else if (initialView === 'flyover') flyoverButton.click();
}
