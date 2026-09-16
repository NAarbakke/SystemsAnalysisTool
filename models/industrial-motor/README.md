# Industrial electric motor demonstrator

An Assembly-only teaching model with eight physical sections: housing, stator, rotor, shaft, two bearings and two end covers. It is not an engine performance simulation or an engineering CAD design. Geometry, material assignments and operating readings are illustrative. Pressure denotes the hypothetical external bearing oil supply, in gauge bar; it is not pressure inside solid material.

Click a section to see relevant readings. The example shows a single synthetic snapshot, not operating phases or measured telemetry. The demo does not drive the displayed geometry at the indicated RPM.

For future civilian CAD datasets, mesh-level GLB extras can carry the following fields (Three.js exposes these through userData):

```json
{
  "description": "Component function supplied by its author",
  "componentInfo": {
    "partNumber": "PART-001",
    "material": "Supplier-specified material",
    "role": "Component role",
    "massKg": 0.5,
    "finish": "Supplier-specified finish",
    "source": "CAD export"
  },
  "operatingDataSource": "Example data",
  "operatingStages": [{
    "id": "snapshot-1",
    "label": "Snapshot 1",
    "readings": [{"label": "Surface temperature", "value": 35, "unit": "°C"}]
  }]
}
```

Physical sections are mesh selections. The operatingStages array contains optional snapshots for a section; it is not an inferred engine-stage topology. The snapshot selector appears only when multiple snapshots are supplied. Missing values are omitted; no material, mass, temperature or pressure is inferred from appearance. The snapshot selection carries across components when IDs match and resets on assembly change.

Useful later additions include a section hierarchy, inlet/outlet station labels for suitable civilian equipment, timestamped sensor/simulation readings, trend plots, supplier-defined operating limits, maintenance information, and provenance. No live data connector or automatic performance calculation is included.
