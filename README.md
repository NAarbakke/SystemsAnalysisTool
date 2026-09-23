# SystemsAnalysisTool

Explore 3D assemblies, engine diagrams, flight replays and simulation plots in your browser. Run it on your computer or share it on an intranet.

## Start here

If you received a ready-built copy with a `dist` folder:

1. Install **Node.js 22.13 or newer**, or **Python 3.9 or newer**, if neither is installed.
2. Double-click **run-local.cmd** in the project folder.
3. Open **http://localhost:3000** in Chrome or Edge.

Keep the server window open while using the app. Press **Ctrl+C** in that window to stop it. Open the web address above, rather than double-clicking an HTML file.

**Starting from source, or updating the app?** With Node.js installed, open PowerShell in this folder and run:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Installing dependencies needs internet access or a prepared npm cache. The build creates `dist`; rebuild after source changes to update the app served by the launcher.

## Choose a tab

| Tab | What you can do |
| --- | --- |
| **Assembly** | Rotate 3D models, separate parts, select components and open your own GLB, STL or STEP assembly. |
| **Engines** | Explore selectable sections of a turbojet, a civilian turbofan and two conceptual rocket diagrams. |
| **Flyover** | Play an example route or load flight data on a globe. Choose satellite, street or offline basemaps and save camera views. |
| **Telemetry** | Import CSV/JSON simulation data, choose signals, zoom plots and export PNG images. |

Use **Appearance** to change light/dark mode and fonts. Preferences are remembered in this browser.

### Assembly

Choose a model, drag to rotate the view and scroll to zoom. Use **Part separation** to spread the parts. Click a part or choose it from **Components** to inspect it.

The built-in models include a precision spindle, industrial electric motor, civilian turbofan and two illustrative vehicle exteriors. Use **Import assembly (.glb, .stl, .step)** for your own model, or **Example GLB** to try a sample. GLB keeps its component hierarchy and materials, STEP arrives as separate named solids, and STL arrives as a single shell. See the [assembly import guide](static/data/assembly-import/README.md) for export settings.

### Engines

Choose an engine from **Model**. Drag the drawing to pan it, scroll or use **+ / −** to zoom, and choose **Fit** to reset the view. Click a part or use the **Components** buttons to inspect it. The buttons also support keyboard selection.

These are 2D schematics, not to scale, with component explanations rather than operating telemetry. The turbojet and turbofan drawings pair a full section with a chart tracing pressure and temperature along the same axial stations. Both curves are qualitative and carry no values.

See the [engine design notes](docs/engine-schematic-review.md) for the implemented improvements and reference limits.

### Flyover and Telemetry

- **Flyover:** try Play first. To use your data, open **Load a flight**, choose its input format and load a CSV. Use **Example** for a matching sample. See [sample files and settings](models/examples/README.md) and the [detailed replay reference](docs/replay-reference.md). Under **Map source**, choose satellite, streets or the offline NASA overview; **Saved views** remembers camera positions in this browser. See [map sources](static/data/maps/README.md).
- **Telemetry:** import CSV/JSON or paste a table, then choose which quantities to plot. Quantities whose names share a base and a unit suffix (`position_x_m`, `position_y_m`, `position_z_m`) are drawn on one chart with a legend, so a vector reads as one picture. The **Overview** strip above the charts covers the whole run: drag inside it to set the time range everywhere. Hovering any chart draws one time crosshair across all of them and fills the **at cursor** column in every header. See the [data format and Python export guide](static/data/dashboard/README.md).

## Offline use and your data

Assemblies, engine diagrams, plots and the bundled NASA globe overview work offline after building. **Satellite and street maps need a network connection** to their configured providers. Detailed offline mapping needs an internal imagery service.

Imported models and simulation files are processed in the browser and cleared on reload. Appearance preferences and saved map views can persist locally. There is no account or live simulation connection. Example models, flight routes and NOTAM areas are illustrative; the app does not calculate flight dynamics or provide engineering measurements.

## Share on an intranet

1. Put the built project on the host computer. It needs Node.js or Python.
2. Run **run-intranet.cmd** on that computer.
3. Other users open **http://HOST-MACHINE-NAME:3000** in their browser.

Keep the host running. Its firewall must allow intranet connections on port 3000. An existing web server such as IIS or nginx can also serve `dist`.

For command-line options and packaging, see the [development and hosting guide](docs/development.md).

## Troubleshooting

- **Page will not open:** check that the server window is still running and use the address it prints.
- **Missing build or old version:** run `npm.cmd ci` if dependencies are missing, then `npm.cmd run build` and restart the server.
- **Port 3000 is busy:** stop the other server, or run `node scripts/serve.mjs --port 8080` and open http://localhost:8080.
- **3D view is blank:** use a browser with WebGL 2 and hardware acceleration enabled.
- **Satellite/street map is blank offline:** switch to the NASA overview.

## For contributors

See [development commands and project layout](docs/development.md). Keep this README focused on using the app; detailed formats and implementation notes belong in the linked guides.
