# Explode Studio

A working CAD exploded-view editor using **Python and Three.js**. Python runs in a Pyodide Web Worker; OpenCascade WebAssembly imports CAD in a second worker. Files stay in the browser. No Python installation, CAD upload service, account, or API key is required for local use.

## Run

Node.js 22.13+ is required. On Windows PowerShell use `npm.cmd` if PowerShell blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server (normally http://localhost:3000).

```sh
npm test
npm run typecheck
npm run build
npm start
```

The predev/prebuild script copies the pinned CAD and Python runtimes from installed packages into public/vendor. They are served from the app, without a runtime CDN dependency. Keep package-lock.json for reproducibility.

## Use

1. Import or drop a STEP/STP, IGES/IGS, BREP, GLB, STL, or OBJ file. The 13-part spindle example opens initially.
2. Select radial separation or one of the three model axes. Adjust spacing and scrub the assembled/exploded timeline.
3. Click a part in the viewport or list to highlight it and override its travel direction. Hide parts individually.
4. Orbit, zoom, and pan with the mouse or touch. Fit/reset the camera as needed. Enable labels, guides, or technical drawing mode.
5. Save the current drawing as PNG, or record one assemble–explode–assemble cycle as WebM (MP4 where supported). Exports include the model, visible labels and guide lines, without the app controls.

## Architecture

- `public/python/explosion.py`: actual Python layout engine. Computes deterministic, bounding-box-separated targets in radial/axial modes and respects per-part overrides. Runs unchanged in CPython or Pyodide.
- `public/workers/planner.mjs`: initializes Pyodide and calls Python through a JSON boundary.
- `public/workers/cad.js`: imports STEP/IGES/BREP using occt-import-js, preserving mesh names, placements and base colors.
- `lib/models.ts`: Three.js geometry conversion and assembly normalization; OBJ, STL, and embedded GLB import.
- `lib/studio.ts`: rendering, picking, camera, animation, labels and export.
- `app/page.tsx`: responsive workspace with accessible controls.

## Limits

- Up to 50 MB, 500 parts, and 2 million triangles; practical capacity depends on device memory. Workers time out after two minutes.
- This is an illustrative exploded view, not a mechanical disassembly solver. Automatic targets clear bounding boxes at 100% with spacing 1×. Intermediate motion, smaller spacing, and manual overrides can intersect. No CAD mates, fastener logic or collision-free removal paths are inferred.
- Each imported CAD mesh or OBJ/GLB mesh is treated as a part. A fused body or typical STL remains one part. Export separate bodies from the source CAD application. Native SLDASM/SLDPRT, F3D, and other proprietary files need STEP export first.
- GLB must contain static meshes and embed its resources. Skinning, instancing extensions, Draco compression, external textures, source animation and complex material textures are not supported. Repeated static nodes and nested transforms are supported. CAD face-level colors are simplified to each part's base color.
- Export uses the current canvas resolution. Keep the browser tab active while recording. Video codec support depends on the browser.
- The X reference could not be fetched (403); visual fidelity to its clip has not been verified.

## Verification

`npm test` runs the real OpenCascade importer and Python interpreter, checking an 18-part STEP assembly, an 18-part BREP assembly, IGES, STL, two-part OBJ, transformed/repeated GLB nodes, malformed CAD, all layout modes, concentric parts, deterministic separation, manual overrides, and single-solid behavior. Fixtures come from the installed occt-import-js package.

The browser automation connection was unavailable in this environment, so visual rendering and downloaded PNG/video playback still require an interactive browser check. The optional WebMCP surface is feature-detected and cannot be validated without a supporting browser.

## Dependencies and reference documentation

- [Three.js](https://threejs.org/docs/)
- [occt-import-js / OpenCascade](https://github.com/kovacsv/occt-import-js)
- [Pyodide Web Workers](https://pyodide.org/en/stable/usage/webworker.html)

The Sites/Vinext scaffold and Shadcn controls provide the web shell. Sites hosting is private to the owner unless access is explicitly changed.
