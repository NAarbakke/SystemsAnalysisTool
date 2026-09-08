import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import '../theme.ts';
import { Viewer, ImageryLayer, UrlTemplateImageryProvider, ArcGisMapServerImageryProvider,
  IonImageryProvider, GeographicTilingScheme, WebMercatorTilingScheme,
  EllipsoidTerrainProvider, Cartesian3, Rectangle, Credit, Ion,
  type ImageryProvider } from 'cesium';
import { parseMapConfig, type MapSource } from './config.ts';

(window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL('./cesium/', document.baseURI).href;
Ion.defaultAccessToken = '';
const sourceSelect = document.querySelector<HTMLSelectElement>('#map-source')!;
const status = document.querySelector<HTMLElement>('#map-status')!;
const retry = document.querySelector<HTMLButtonElement>('#map-retry')!;
const quality = document.querySelector<HTMLSelectElement>('#map-quality')!;

function message(text: string, error = false) {
  status.textContent = text; status.dataset.error = String(error); retry.hidden = !error;
}
function absoluteTemplate(url: string) {
  return new URL(url, document.baseURI).href.replaceAll('%7B', '{').replaceAll('%7D', '}');
}
function creditFor(source: MapSource) {
  const span = document.createElement(source.creditUrl ? 'a' : 'span');
  span.textContent = source.credit || source.name;
  if (span instanceof HTMLAnchorElement) { span.href = source.creditUrl!; span.target = '_blank'; span.rel = 'noopener noreferrer'; }
  return new Credit(span.outerHTML, true);
}
async function providerFor(source: MapSource): Promise<ImageryProvider> {
  if (source.type === 'arcgis') return ArcGisMapServerImageryProvider.fromUrl(absoluteTemplate(source.url!), { enablePickFeatures: false });
  if (source.type === 'ion') return IonImageryProvider.fromAssetId(source.assetId!, { accessToken: source.accessToken! });
  return new UrlTemplateImageryProvider({
    url: absoluteTemplate(source.url!), maximumLevel: source.maximumLevel,
    tileWidth: source.tileSize || 256, tileHeight: source.tileSize || 256,
    tilingScheme: source.projection === 'geographic' ? new GeographicTilingScheme() : new WebMercatorTilingScheme(),
    rectangle: source.bounds ? Rectangle.fromDegrees(...source.bounds) : undefined,
    credit: creditFor(source), enablePickFeatures: false,
  });
}

async function initialize() {
  const response = await fetch(new URL('./data/maps/sources.json', document.baseURI), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Cannot read data/maps/sources.json.');
  const config = parseMapConfig(await response.json());
  const viewer = new Viewer('map-globe', {
    baseLayer: false, terrainProvider: new EllipsoidTerrainProvider(),
    baseLayerPicker: false, geocoder: false, animation: false, timeline: false,
    homeButton: false, sceneModePicker: false, navigationHelpButton: false,
    fullscreenButton: false, infoBox: false, selectionIndicator: false,
    requestRenderMode: true, maximumRenderTimeChange: Infinity, shouldAnimate: false,
    useBrowserRecommendedResolution: false, msaaSamples: 4,
  });
  viewer.scene.globe.enableLighting = false;
  viewer.scene.globe.tileCacheSize = 512;
  viewer.scene.postProcessStages.fxaa.enabled = false;
  // The static map doesn't need a continual animation/render loop.
  function applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    viewer.resolutionScale = quality.value === 'native' ? 1 : (quality.value === 'balanced' ? 1 : Math.min(2, dpr)) / dpr;
    viewer.scene.globe.maximumScreenSpaceError = quality.value === 'balanced' ? 2 : 1;
    viewer.resize(); viewer.scene.requestRender();
  }
  quality.addEventListener('change', applyQuality);
  window.addEventListener('resize', applyQuality); applyQuality();
  const places: Record<string, [number, number, number]> = {
    earth: [10, 25, 26_000_000], europe: [12, 50, 4_000_000],
    oslo: [10.752, 59.907, 1700], sanfrancisco: [-122.395, 37.796, 2000],
  };
  function moveToPlace(id: string, duration = 1.3) {
    viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(...places[id]), orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 }, duration });
  }
  document.querySelector<HTMLSelectElement>('#map-place')!.addEventListener('change', event => moveToPlace((event.target as HTMLSelectElement).value));
  moveToPlace('earth', 0);
  viewer.scene.postRender.addEventListener(() => {
    const height = viewer.camera.positionCartographic.height;
    document.querySelector<HTMLOutputElement>('#map-scale')!.value = `Camera height · ${height > 1000 ? `${(height / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km` : `${Math.round(height)} m`}`;
  });
  sourceSelect.replaceChildren(...config.sources.map(source => new Option(source.name, source.id)));
  sourceSelect.disabled = false;
  let revision = 0;
  let activeSource: MapSource | undefined;
  let pending = false;
  let tileFailed = false;
  let removeErrorListener: (() => void) | undefined;
  let removeCredit: (() => void) | undefined;
  let selectedId = config.defaultSource;
  try {
    const saved = localStorage.getItem('civilian-map-source');
    if (config.sources.some(source => source.id === saved)) selectedId = saved!;
  } catch { /* Storage is optional. */ }

  async function switchSource(id: string) {
    const source = config.sources.find(s => s.id === id)!;
    const token = ++revision;
    sourceSelect.value = id; pending = true;
    message(`Connecting to ${source.name}…`);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const provider = await Promise.race([
        providerFor(source),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Map service connection timed out.')), 15000); }),
      ]);
      if (token !== revision) return;
      removeErrorListener?.(); removeCredit?.();
      tileFailed = false;
      removeErrorListener = provider.errorEvent.addEventListener(() => {
        if (token !== revision) return;
        tileFailed = true;
        message(`${source.name}: some tiles could not load. Check service access or coverage; retry or choose another source.`, true);
      });
      // Replace the entire base layer: preserve the camera, never blend unrelated providers.
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.add(new ImageryLayer(provider));
      // Keep the provider's own dynamic attribution, and make its main credit visible.
      if (provider.credit) {
        const credit = new Credit(provider.credit.html, true);
        viewer.creditDisplay.addStaticCredit(credit);
        removeCredit = () => viewer.creditDisplay.removeStaticCredit(credit);
      }
      activeSource = source; pending = false;
      document.querySelector('#source-description')!.textContent = source.description;
      document.querySelector('#source-network')!.textContent = source.network === 'online' ? 'Online imagery · local app' : 'Local / intranet imagery';
      document.querySelector('#source-detail')!.textContent = provider.maximumLevel === undefined ? 'Source-controlled detail' : `Tile levels 0–${provider.maximumLevel}`;
      message('Loading visible map tiles…');
      try { localStorage.setItem('civilian-map-source', source.id); } catch { /* Optional preference. */ }
      viewer.scene.requestRender();
    } catch (error) {
      if (token !== revision) return;
      pending = false;
      message(`Could not open ${source.name}. ${activeSource ? `${activeSource.name} is still displayed.` : 'Choose another source or retry.'} ${error instanceof Error ? error.message : ''}`, true);
    } finally { clearTimeout(timeout); }
  }
  viewer.scene.globe.tileLoadProgressEvent.addEventListener((count: number) => {
    if (pending || tileFailed || status.dataset.error === 'true' || !activeSource) return;
    message(count ? `Loading visible map tiles… ${count} pending` : `Viewing ${activeSource.name}`);
  });
  sourceSelect.addEventListener('change', () => { void switchSource(sourceSelect.value); });
  retry.addEventListener('click', () => { void switchSource(sourceSelect.value); });
  viewer.scene.renderError.addEventListener(() => message('The graphics renderer stopped. Reload the page or try a browser with WebGL support.', true));
  await switchSource(selectedId);
}
initialize().catch(error => {
  message(`Map viewer could not start. ${error instanceof Error ? error.message : String(error)}`, true);
  retry.textContent = 'Reload map viewer'; retry.addEventListener('click', () => location.reload());
});
