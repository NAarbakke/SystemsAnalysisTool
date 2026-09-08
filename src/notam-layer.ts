import { Cartesian3, Cartesian2, Color, CustomDataSource, HeightReference, PolygonHierarchy, type Viewer } from 'cesium';
import { parseNotamAreas } from './notam-data.ts';

export async function addNotamLayer(viewer: Viewer) {
  const status = document.querySelector<HTMLElement>('#notam-status')!;
  const list = document.querySelector<HTMLElement>('#notam-list')!;
  const toggle = document.querySelector<HTMLInputElement>('#show-notams')!;
  try {
    const response = await fetch(new URL('./data/notams.geojson', document.baseURI));
    if (!response.ok) throw new Error(`Area file returned HTTP ${response.status}.`);
    const areas = parseNotamAreas(await response.json());
    const source = new CustomDataSource('NOTAM areas');
    for (const area of areas) {
      const ring = area.radius ? area.coordinates : area.coordinates.slice(0, -1);
      const center = ring.reduce((sum, point) => [sum[0] + point[0] / ring.length, sum[1] + point[1] / ring.length], [0, 0]);
      const color = Color.fromCssColorString(area.color);
      const positions = area.coordinates.map(point => Cartesian3.fromDegrees(...point));
      source.entities.add({ id: area.id, name: area.title,
        position: Cartesian3.fromDegrees(center[0], center[1]),
        label: { text: area.title, font: 'bold 13px sans-serif', fillColor: color, showBackground: true,
          backgroundColor: Color.BLACK.withAlpha(.8), pixelOffset: new Cartesian2(0, -12), heightReference: HeightReference.CLAMP_TO_GROUND },
        ...(area.radius ? { ellipse: { semiMajorAxis: area.radius, semiMinorAxis: area.radius,
          material: color.withAlpha(.28), height: 0, outline: true, outlineColor: color } }
          : { polygon: { hierarchy: new PolygonHierarchy(positions), material: color.withAlpha(.28), height: 0 },
            polyline: { positions, width: 3, material: color, clampToGround: true } }),
      });
      const item = document.createElement('p');
      item.textContent = `${area.title}: ${area.description}`;
      item.className = 'coordinate-note';
      list.appendChild(item);
    }
    await viewer.dataSources.add(source);
    source.show = toggle.checked;
    toggle.disabled = false;
    toggle.addEventListener('change', () => { source.show = toggle.checked; viewer.scene.requestRender(); });
    status.textContent = `${areas.length} ground areas · ${areas.every(area => area.demo) ? 'DEMO DATA — not real NOTAMs' : 'local data file'}`;
    viewer.scene.requestRender();
  } catch (cause) {
    status.textContent = `Areas unavailable: ${cause instanceof Error ? cause.message : 'could not load local data'}`;
  }
}
