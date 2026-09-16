# Civilian basemap sources

Configures the basemap under Flyover's globe, in the **Map source** panel. Choose a source; the camera stays in place so the same area can be compared. Source selection and saved camera views persist locally in this browser. High display quality is the default; Native uses the screen's full pixel density.

## What actually improves resolution

The bundled NASA Blue Marble tile pyramid ends at geographic zoom 6: 32,768 pixels around the equator, about 1.2 km per pixel — the full resolution of the bundled source photo. Increasing canvas size cannot invent ground detail. The new viewer streams a complete tile pyramid from the selected source and requests more detailed tiles as you zoom. Esri's tile metadata determines its maximum level; no level-5 cap is applied. The static globe requests finer detail with a screen-space error of 1 pixel. All layers use a smooth ellipsoid; this does not add elevation or 3D buildings.

| Source | Use | Access / limits |
| --- | --- | --- |
| Esri World Imagery | Satellite and aerial detail; metre-or-better imagery in many places | Online. Capture dates and native resolution vary. Tile zoom does not guarantee equivalent photographic resolution. |
| OpenStreetMap | Roads, place names, buildings and paths | Online public service; zoom 0–19. Not satellite imagery. Respect public-service capacity and tile usage policy. |
| NASA Blue Marble | Offline whole-Earth context | Included locally; coarse imagery only. |
| Google / Bing imagery through Cesium ion | Additional premium imagery to compare for your area | Configure a licensed imagery asset and a browser-safe, read-only ion token below. Online access required. |
| Your orthophotos / tile server | Best option for detailed coverage on a disconnected intranet | Supply a licensed local tile pyramid with the desired native resolution and geographic coverage. |

There is no globally highest-resolution provider. National/local aerial surveys may be sharper and more recent than a global mosaic. Compare actual locations and source dates. Google/Bing access is not provisioned by this project; no account, subscription or cloud hosting was created.

## Intranet configuration

Edit `static/data/maps/sources.json` before building, or `dist/data/maps/sources.json` on the deployed server (no rebuild needed for that copy). Set `allowOnline` to `false` for a disconnected intranet, and set `defaultSource` to your internal map. Online entries are filtered before any providers are initialized, and saved online preferences are ignored. The bundled offline source remains available. If no internal detailed source is configured, only the coarse NASA fallback is available.

`network` is an administrator-declared classification, not a firewall. Ensure entries labelled `intranet` resolve only to approved internal services. Fonts, scripts and Cesium assets are local. Maps are fetched by the user's browser, so separate tile hosts need CORS; HTTPS pages require HTTPS tile endpoints. The app is still hosted locally even when an online source is selected.

Example internal XYZ entry to add to `sources`:

```json
{
  "id": "local-ortho",
  "name": "Internal orthophotos",
  "description": "Local aerial imagery; coverage and capture date supplied by the map administrator.",
  "type": "xyz",
  "network": "intranet",
  "url": "http://maps.internal/ortho/{z}/{x}/{y}.jpg",
  "maximumLevel": 20,
  "tileSize": 256,
  "projection": "mercator",
  "bounds": [5, 58, 12, 63],
  "credit": "Your imagery owner / licence"
}
```

Use the actual maximum tile level, tile size and bounds of your dataset. `bounds` is optional; it prevents requests outside regional coverage. XYZ uses a top-origin y; TMS can use `{reverseY}` instead of `{y}`. Geographic tiling is also supported (`projection: "geographic"`, EPSG:4326 with two tiles across at level zero). Native EPSG:3857 XYZ is the default. Regional layers extend their edge colours beyond coverage as a Cesium base map; those areas are not imagery coverage.

ArcGIS Server: use `type: "arcgis"`, `network: "intranet"`, and your `/MapServer` URL. Its tile metadata supplies the pyramid and attribution. ArcGIS endpoints must advertise a Cesium-supported projection. For WMS/WMTS-only services, publish an XYZ tile cache or ArcGIS MapServer endpoint for this viewer.

Licensed Cesium imagery example:

```json
{
  "id": "licensed-satellite",
  "name": "Licensed satellite imagery",
  "description": "The imagery asset selected in your Cesium ion account.",
  "type": "ion",
  "network": "online",
  "assetId": 123456,
  "accessToken": "YOUR_READ_ONLY_BROWSER_TOKEN"
}
```

Replace the example ID with an imagery asset you can access (e.g. Google satellite or Bing aerial). Client configuration is public: use only an asset-scoped, URL-restricted read-only token, never an administrative secret. The viewer replaces layers rather than combining providers and preserves source attribution. This example is not a configured subscription.

Use ordinary browser caching; this viewer does not bulk-download or package public tiles. For offline use, obtain imagery with offline hosting rights and serve your own pyramid. In particular, do not scrape OpenStreetMap's public tile server or copy commercial streamed tiles into the repository. The existing repo workflow is sufficient; no intranet ZIP is produced.

## Source documentation

- Esri coverage: https://www.arcgis.com/home/item.html?id=226d23f076da478bba4589e7eae95952
- Cesium ArcGIS provider: https://cesium.com/learn/cesiumjs/ref-doc/ArcGisMapServerImageryProvider.html
- Google and Bing imagery in ion: https://cesium.com/blog/2025/10/02/introducing-google-maps-2d-tiles/
- Imagery usage and attribution: https://cesium.com/learn/ion/content-usage-and-attribution-guide/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/

If a source fails, the viewer reports the failure and offers Retry. An initialization failure keeps the previous map; tile failures are reported without silently switching to a lower-resolution source. Select Offline explicitly when needed.
