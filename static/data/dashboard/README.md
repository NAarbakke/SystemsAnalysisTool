# Telemetry: local simulation dashboard

Open `http://localhost:3000` and select Telemetry after building and starting the server. It shares navigation and the theme with Assembly and Flyover. Switching tabs retains the loaded dataset and quantity selection. The old dashboard.html URL redirects to this tab. Data import remains independent of the vehicle viewers; the dashboard does not run a flight solver.

## Python integration

Export one sample per row. Include units in column names. Values are displayed as supplied; there are no frame transforms, unit conversions, or integrations.

```python
import pandas as pd

# time: your simulation time array
# quantities: dictionary of named, equally sized numeric arrays
# Example keys: position_x_m, velocity_x_m_s, roll_deg, p_rad_s
table = pd.DataFrame({"time_s": time, **quantities})
table.to_csv("simulation.csv", index=False)
# Or JSON rows; missing values become null:
table.to_json("simulation.json", orient="records", double_precision=15)
```

Pandas is only one export option on the Python side. Standard-library csv/json also work; the browser does not require Python.

```csv
time_s,position_x_m,velocity_x_m_s,roll_deg
0,0,0,0
0.1,0.002,0.04,0.2
0.2,0.008,0.08,0.3
```

JSON supports row objects or equal-length column arrays:

```json
{"time_s":[0,0.1,0.2],"position_x_m":[0,0.002,0.008]}
```

## Import rules

- Open CSV/JSON or paste text. A local Web Worker parses it; nothing is uploaded.
- Time must be numeric, complete, and strictly increasing. Choose the Time column if automatic detection picks incorrectly. No sorting or deduplication is performed.
- All numeric quantities are selected by default, except phase channels (see below). Position, velocity, Euler/quaternion components, rates, and extra outputs are simply named series; no state-vector convention is prescribed.
- A column whose name contains `phase`, `state`, `mode`, `stage`, `event`, `flag` or `status`, and which steps between at most 12 whole numbers, is read as a phase channel. Its transitions are drawn as dotted vertical rules on every chart and labelled on the Overview strip. Nothing else is inferred from the data: no burnout, apogee or staging is detected on your behalf.
- Empty cells and JSON null become gaps. Entirely empty columns and columns with nonnumeric/nonfinite values are skipped with a notice.
- Limits: 50 MB, 200,000 samples, 128 columns. Unique column names must contain 1–120 characters.
- Every CSV row must match the header length. JSON column arrays must be equally sized. JSON rows may omit values (gaps), but cannot introduce new columns after the first row.

## Explore

Search and select quantities individually. Select all / Clear selection affect all quantities, including search-hidden ones.

Quantities are read as `<base>_<component>_<unit>`, and those sharing a base and a unit share one chart with a legend: `position_x_m`, `position_y_m` and `position_z_m` become a single **Position (m)** plot. Recognised components are `x/y/z`, `n/e/d/u`, `1/2/3`, `roll/pitch/yaw` and `p/q/r`; everything else keeps its own chart. Names that carry no unit suffix, or an unrecognised one, are never merged. Colour follows the component, not its place in the list, so hiding one series never recolours the rest, and quantities of different units are never put on one pair of axes.

Each header is a data row: the value **at cursor**, then the minimum, maximum and mean. Hovering any chart draws one time crosshair across all of them and fills that column everywhere, so one instant can be read across every quantity at once.

The **Overview** strip spans the whole run with each quantity scaled to its own range, which shows where things happen rather than how large they are — read values off the charts, not the strip. Drag inside it to set the time range on every chart. Individual charts carry no x-axis title; the strip names the time column.

Drag to zoom. Link time zoom propagates the horizontal range to the other plots and the Overview; vertical ranges are independent. Double-click resets a plot. Reset zoom resets all. Show samples adds markers. The camera icon exports a PNG. One/two-column layouts adapt to screen width. Light and dark themes are available.

Above 5,000 samples, plots use per-bin extrema, endpoints, and a gap marker, and carry a **sampled** chip. Header statistics always use all samples. Hover reports retained source samples exactly, but zoom does not restore omitted samples, and closely spaced gaps may be simplified. Export a shorter interval for full sample inspection.

The demo contains independent synthetic motion signals for UI testing, including a `flight_phase` channel that steps four times so the phase rules are visible. It is not a physically consistent trajectory or simulation result, and the phase numbers name nothing.

## Stack

TypeScript + Vite, uPlot (canvas line charts), Papa Parse, and a module Web Worker. Fonts and libraries are bundled locally. No CDN, backend, live stream, cloud account, or separate ZIP. The current integration is file-based.
