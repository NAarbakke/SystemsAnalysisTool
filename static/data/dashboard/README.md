# Signal Studio: local simulation dashboard

Open `http://localhost:3000` and select Signal Studio after building and starting the server. It shares navigation and the theme with Assembly and Flyover. Switching tabs retains the loaded dataset and quantity selection. The old dashboard.html URL redirects to this tab. Data import remains independent of the vehicle viewers; the dashboard does not run a flight solver.

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
- All numeric quantities are selected by default. Position, velocity, Euler/quaternion components, rates, and extra outputs are simply named series; no state-vector convention is prescribed.
- Empty cells and JSON null become gaps. Entirely empty columns and columns with nonnumeric/nonfinite values are skipped with a notice.
- Limits: 50 MB, 200,000 samples, 128 columns. Unique column names must contain 1–120 characters.
- Every CSV row must match the header length. JSON column arrays must be equally sized. JSON rows may omit values (gaps), but cannot introduce new columns after the first row.

## Explore

Search and select quantities individually. Select all / Clear selection affect all quantities, including search-hidden ones. Every quantity has its own y-axis, keeping different units separate.

Drag to zoom. Link time zoom propagates the horizontal range to other plots; vertical ranges are independent. Double-click resets a plot. Reset zoom resets all. Show samples adds markers. Hover displays coordinates; the camera icon exports a PNG. One/two-column layouts adapt to screen width. Dark mode is available.

Above 5,000 samples, plots use per-bin extrema, endpoints, and a gap marker. Card statistics use all samples. Hover reports retained source samples exactly, but zoom does not restore omitted samples, and closely spaced gaps may be simplified. Export a shorter interval for full sample inspection.

The demo contains independent synthetic motion signals for UI testing. It is not a physically consistent trajectory or simulation result.

## Stack

TypeScript + Vite, Plotly.js basic (SVG line charts), Papa Parse, and a module Web Worker. Fonts and libraries are bundled locally. No CDN, backend, live stream, cloud account, or separate ZIP. The current integration is file-based.
