# Local NOTAM visualization input

`notams.geojson` is loaded once when Flyover initializes. Replace this deployed file and reload the page to provide intranet data. No stream or external service is configured.

The included records are explicitly synthetic demo shapes, not actual NOTAMs. They lie near the default 60-second example route. They do not indicate restrictions along a different imported flight.

Supported GeoJSON: a `FeatureCollection` containing either a single-ring `Polygon`, or a `Point` with numeric `properties.radius_m` to draw a circle. Coordinates are `[longitude, latitude]` in WGS84 degrees. Polygon rings must be closed; holes and multipolygons are currently unsupported. The shapes are ground footprints only; altitude bands and activation times are not interpreted.

Each feature accepts an `id` and these properties:

- `title`: map label.
- `description`: text in the areas panel.
- `radius_m`: circle radius, required for Point geometry.
- `color`: six-digit hex color.
- `demo`: true for synthetic examples.

Limits: 1,000 areas; 5,000 coordinates per polygon; circle radius greater than zero and at most 2,000 km. The viewer validates coordinates and renders titles/descriptions as text. Areas have their own Cesium data source and remain visible when a new flight is loaded. Show NOTAM areas toggles the entire layer.

This format stores geographic footprints and display metadata. Parsing raw NOTAM bulletins, resolving aviation altitude references, or consuming a live intranet service is not implemented.
