# Development and hosting

[Back to the user guide](../README.md)

## Run from source

Use Node.js 22.13 or newer. In PowerShell, from the project root:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. Stop the production server first if it uses that port. Dependency installation needs npm access or a prepared cache.

## Check and build changes

```powershell
npm.cmd test
npm.cmd run build
```

The build includes TypeScript checking and writes the production app to `dist/`. For visual changes, also inspect the affected screen in light and dark modes, at desktop and narrow widths. Automated tests do not establish drawing realism.

Both development and production builds prepare Cesium's local assets. Deploy the entire `dist/` folder, including imagery, workers and license metadata. Flyover's configured online basemap sources still require a network connection.

## Project layout

| Location | Purpose |
| --- | --- |
| `models/index.ts` | 3D model catalogue and starting camera views. |
| `models/<name>/model.ts` | Authored 3D assemblies. |
| `models/engine-diagrams/` | Selectable SVG engine illustrations. |
| `src/main.ts`, `src/assembly.ts` | Assembly viewer and shared model interface. |
| `src/engines/` | Engine diagram interaction and styling. |
| `src/flyover.ts`, `src/basemap.ts` | Globe, flight replay and basemap source switching. |
| `src/dashboard/` | Telemetry. |
| `static/data/` | Data examples, configuration and format guides. |
| `scripts/serve.mjs`, `scripts/serve.py` | Local/intranet static servers. |

To add a 3D model, create its folder under `models/` and register its factory in `models/index.ts`. The catalogue distinguishes Assembly-only examples from the models also available in Flyover. Engine SVG diagrams have a separate catalogue in `src/engines/main.js`.

GLB viewing imports are supported. STEP/SolidWorks conversion and editable CAD features are not provided by the browser. See the [GLB import guide](../static/data/assembly-import/README.md).

## Server options

```powershell
node scripts/serve.mjs
node scripts/serve.mjs --host 0.0.0.0 --port 8080
```

The first command listens on this computer only, on port 3000. The second permits network access on port 8080. Python equivalents use `python scripts/serve.py` with the same options; Windows users can use `py -3 scripts/serve.py`.

The runtime host needs Node.js or Python, but not npm dependencies when `dist/` is already built. Both servers serve `dist/`, not the source tree. Keep the server running and configure the host firewall for the chosen intranet port. Use your organisation's service setup for automatic startup.

IIS, nginx or another static web server can serve `dist/` directly. Relative asset paths support an intranet subdirectory. No cloud hosting configuration is required.

## Optional portable package

After installing dependencies and building:

```powershell
npm.cmd run package:intranet
```

This creates a new folder under `outputs/` containing the build, launchers, server scripts and examples. Copy the whole folder to the host. The package script does not rebuild the app. Its generated usage notes may lag the current interface; use the repository README and linked guides for current instructions. Repository documentation links require the corresponding source folders and are not all included in the portable package.

## Additional references

- [Replay formats and coordinate conventions](replay-reference.md)
- [Example flight files](../models/examples/README.md)
- [Engine diagram structure](../models/engine-diagrams/README.md)
- [Engine realism suggestions](engine-schematic-review.md)
- [NASA imagery provenance and regeneration](../static/earth/README.md)
- [Demo NOTAM data format](../static/data/README.md)

The orientation and orientation-replay modules remain in the source, but their old manual controls are not exposed in the current Assembly screen. The replay reference marks those instructions as legacy.
