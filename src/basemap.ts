import {
  ArcGisMapServerImageryProvider, Cartesian3, Credit, GeographicTilingScheme, ImageryLayer, IonImageryProvider,
  Rectangle, UrlTemplateImageryProvider, WebMercatorTilingScheme, type ImageryProvider, type Viewer,
} from 'cesium';
import { parseMapConfig, type MapSource } from './basemap-config.ts';
import { parseBookmarks, type MapBookmark } from './basemap-bookmarks.ts';

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

/** Wires the shared civilian basemap (switchable source, display quality, saved camera views) into an existing viewer. */
export async function attachBasemap(viewer: Viewer) {
  const sourceSelect = document.querySelector<HTMLSelectElement>('#map-source')!;
  const status = document.querySelector<HTMLElement>('#map-status')!;
  const retry = document.querySelector<HTMLButtonElement>('#map-retry')!;
  const quality = document.querySelector<HTMLSelectElement>('#map-quality')!;

  function message(text: string, error = false) {
    status.textContent = text; status.dataset.error = String(error); retry.hidden = !error;
  }
  function applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    viewer.resolutionScale = quality.value === 'native' ? 1 : (quality.value === 'balanced' ? 1 : Math.min(2, dpr)) / dpr;
    viewer.scene.globe.maximumScreenSpaceError = quality.value === 'balanced' ? 2 : 1;
    viewer.resize(); viewer.scene.requestRender();
  }
  quality.addEventListener('change', applyQuality);
  window.addEventListener('resize', applyQuality); applyQuality();
  viewer.scene.globe.tileCacheSize = 512;

  try {
    const response = await fetch(new URL('./data/maps/sources.json', document.baseURI), { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Cannot read data/maps/sources.json.');
    const config = parseMapConfig(await response.json());

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
        if (provider.credit) {
          const credit = new Credit(provider.credit.html, true);
          viewer.creditDisplay.addStaticCredit(credit);
          removeCredit = () => viewer.creditDisplay.removeStaticCredit(credit);
        }
        activeSource = source; pending = false;
        const network = document.querySelector('#source-network');
        if (network) network.textContent = source.network === 'online' ? 'Online' : 'Local / intranet';
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
      message(count ? 'Loading tiles…' : '');
    });
    sourceSelect.addEventListener('change', () => { void switchSource(sourceSelect.value); });

    const bookmarkKey = 'civilian-map-views-v1';
    let bookmarks: MapBookmark[] = [];
    const savedStatus = document.querySelector<HTMLElement>('#saved-view-status')!;
    const savedList = document.querySelector<HTMLElement>('#saved-view-list')!;
    try { bookmarks = parseBookmarks(JSON.parse(localStorage.getItem(bookmarkKey) || '[]')); } catch { /* Optional storage. */ }
    function persistBookmarks() {
      try { localStorage.setItem(bookmarkKey, JSON.stringify(bookmarks)); savedStatus.textContent = ''; }
      catch { savedStatus.textContent = 'Saved for this session only.'; }
      renderBookmarks();
    }
    function renderBookmarks() {
      savedList.replaceChildren();
      for (const bookmark of bookmarks) {
        const row = document.createElement('div'); row.className = 'saved-view-row';
        const open = document.createElement('button'); open.type = 'button'; open.textContent = bookmark.name;
        open.addEventListener('click', async () => {
          if (config.sources.some(s => s.id === bookmark.source)) {
            const expectedRevision = revision + 1;
            await switchSource(bookmark.source);
            if (revision !== expectedRevision) return;
          }
          else savedStatus.textContent = 'Saved source unavailable; using current map.';
          const [heading, pitch, roll] = bookmark.orientation;
          viewer.camera.setView({ destination: new Cartesian3(...bookmark.position), orientation: { heading, pitch, roll } });
          viewer.scene.requestRender();
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
        remove.setAttribute('aria-label', `Delete ${bookmark.name}`);
        remove.addEventListener('click', () => { bookmarks = bookmarks.filter(b => b !== bookmark); persistBookmarks(); });
        row.append(open, remove); savedList.append(row);
      }
    }
    renderBookmarks();
    document.querySelector('#save-map-view')!.addEventListener('submit', event => {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>('#map-view-name')!;
      const name = input.value.trim(); if (!name || !activeSource || pending) return;
      if (bookmarks.length >= 30) { savedStatus.textContent = '30 views saved. Delete a view to add another.'; return; }
      const { x, y, z } = viewer.camera.positionWC;
      bookmarks.push({ name, source: activeSource.id, position: [x, y, z], orientation: [viewer.camera.heading, viewer.camera.pitch, viewer.camera.roll] });
      input.value = ''; persistBookmarks();
    });
    retry.addEventListener('click', () => { void switchSource(sourceSelect.value); });
    await switchSource(selectedId);
  } catch (error) {
    message(`Map source could not start. ${error instanceof Error ? error.message : String(error)}`, true);
    retry.textContent = 'Reload page';
    retry.addEventListener('click', () => location.reload());
  }
}
