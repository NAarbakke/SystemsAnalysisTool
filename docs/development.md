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

The build includes TypeScript checking and writes the production app to `dist/`. For visual changes, also inspect the affected screen in light and dark modes, at desktop and narrow widths. `npm.cmd run screenshots` saves every view in both modes to `outputs/screenshots/` (add a width and height, such as `-- 390 844`, for a narrow screen); it needs Chrome or Edge and a current build. Automated tests do not establish drawing realism.

Both development and production builds prepare Cesium's local assets. Deploy the entire `dist/` folder, including imagery, workers and license metadata. Flyover's configured online basemap sources still require a network connection.

## Project layout

| Location | Purpose |
| --- | --- |
| `src/main.ts` | Entry point: loads the theme and starts the shell. |
| `src/app/views.ts` | The view registry: one entry per navigation tab, loaded on first visit. |
| `src/app/shell.ts`, `src/app/theme.ts` | Navigation, view switching and the colour mode. |
| `src/core/` | Framework-free helpers shared by views: timed-CSV parsing (`timed-csv.ts`), time-series lookup (`series.ts`) and DOM building (`dom.ts`). |
| `src/three/` | Three.js building blocks: the `Assembly` interface and `createAssembly` (`assembly.ts`), staging (`stage.ts`), surface finishes (`finishes.ts`) and GLB/STL/STEP import (`import/`). |
| `src/views/<view>/` | One folder per tab, each with `main.ts` (exports `mount(container)`), `view.html` and `style.css`. Flyover keeps its flight parsing, basemap and NOTAM code in subfolders. |
| `src/styles/` | Shared design tokens (`tokens.css`), controls and panels (`base.css`) and the shell layout (`shell.css`). |
| `models/assemblies/` | Authored 3D assemblies, one folder each, catalogued in `index.ts`. `display-details.ts` holds the shared geometry helpers. |
| `models/engine-diagrams/` | Selectable SVG engine illustrations, catalogued in `index.js`. |
| `static/data/` | Data examples, configuration and format guides. |
| `scripts/serve.mjs` | Local/intranet static server for `dist/`. |

### Extending

- **A 3D model:** create `models/assemblies/<name>/model.ts` exporting a factory (use `assemblyBuilder` from `display-details.ts`, or `createAssembly` directly), then add one entry to `models/assemblies/index.ts`. Entries in `models` also appear in Flyover; set `flyoverRotation` if the model's long axis is not Y. The factory is imported only when the model is first chosen.
- **An engine diagram:** add `models/engine-diagrams/<name>/model.js` and one line in `models/engine-diagrams/index.js`.
- **A tab:** add `src/views/<name>/main.ts` exporting `mount(container)`, which returns `{ setVisible }`, and add one entry to `src/app/views.ts`. The shell creates the button and container, and loads the view on its first visit.

GLB viewing imports are supported. STEP/SolidWorks conversion and editable CAD features are not provided by the browser. See the [GLB import guide](../static/data/assembly-import/README.md).

## Server options

```powershell
node scripts/serve.mjs
node scripts/serve.mjs --host 0.0.0.0 --port 8080
```

The first command listens on this computer only, on port 3000. The second permits network access on port 8080.

The server serves `dist/`, not the source tree. Keep the server running and configure the host firewall for the chosen intranet port. Use your organisation's service setup for automatic startup.

IIS, nginx or another static web server can serve `dist/` directly. Relative asset paths support an intranet subdirectory. No cloud hosting configuration is required.

## Additional references

- [Replay formats and coordinate conventions](replay-reference.md)
- [Example flight files](../models/examples/README.md)
- [Engine diagram structure](../models/engine-diagrams/README.md)
- [Engine realism suggestions](engine-schematic-review.md)
- [NASA imagery provenance and regeneration](../static/earth/README.md)
- [NOTAM data format](../static/data/README.md)

