# Assembly import

In Assembly, choose **Import assembly (.glb, .stl, .step)** and open a file. Files are read locally, never uploaded. The last imported assembly remains in the model picker while you browse built-in models. A new import replaces that slot. Reloading the page clears the local import; reopen the file to view it again. A failed import keeps the current model.

## Export from SolidWorks

Use a **self-contained glTF 2.0 binary (.glb)** export with the model in its assembled configuration. SolidWorks versions with the Extended Reality/XR exporter can export GLB; in Visualize use **File > Export > Export Project**, then choose GLB. Menu availability depends on your version/install.

- Disable **Draco compression**. Meshopt, KTX2 and GPU instancing are also unsupported in this importer.
- Embed textures and geometry in the GLB. Standard PNG/JPEG textures are supported. External file references are blocked.
- Retain individual component nodes/meshes. Avoid merging all geometry into a single mesh if you want separate visual parts.
- Start with moderate tessellation and sensible texture sizes. The importer accepts files up to 100 MB, 5,000 mesh parts and 2 million triangles. Smaller exports are more responsive.
- Native `.sldasm`/`.sldprt` and IGES are not read directly. GLB is the richest viewing copy; keep the original SolidWorks files for CAD editing.

## STEP and STL

STEP (`.step`, `.stp`) is read in the browser by an embedded OpenCascade kernel, which tessellates the solids on open. The first STEP file of a session loads a 7 MB kernel, so it takes a few seconds; later files are faster. Each solid becomes its own selectable, separable part, keeping its name and colour where the export carries them. Assembly structure beyond that flat list of solids, and any CAD history, is not reconstructed.

STL (`.stl`, binary or ASCII) carries one untextured shell with no names, colours or components, so it imports as a single part and the separation slider has nothing to spread. Use it for a quick look at one part rather than an assembly.

The scene hierarchy, component transforms, mesh names and exported materials are retained. The displayed assembly is centered and uniformly scaled to fit the viewer; it is **not a measurement tool**. Only the default GLB scene is displayed. Cameras and lights from the file are removed in favour of the viewer lighting. Exported animations, CAD mates, constraints and feature history are not played or reconstructed. Rigid meshes are supported; skinned models are not.

The existing separation slider applies an **automatic radial spread of mesh parts**. It is illustrative and does not reproduce SolidWorks exploded-view instructions or infer a valid disassembly sequence. A component exported as several material meshes can separate into those meshes. A single merged mesh cannot be split into CAD parts here. Original positions are restored at zero separation.

Open **SolidWorks import > Try example GLB** to test the same loader with a small six-part fixture. Download `example.glb` beside this guide to test the file chooser. Its source generator is `models/import-example/generate.mjs`.

Official export references:

- SolidWorks / Visualize XR exporter: https://blogs.solidworks.com/products/solidworks/unleashing-the-future-solidworks-extended-reality-xr-a-dive-into-immersive-3d-experiences/
- Visualize export and Draco: https://blogs.solidworks.com/products/solidworks/solidworks-support-monthly-news-april-2021/

Actual fidelity depends on the SolidWorks exporter and chosen export settings. Verify your assembly visually after import.
