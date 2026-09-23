# CAD authoring and the local Three.js viewer

The viewer generates each model from its own `models/<model-name>/model.ts` file.
The CAD workflow below is a proposed workflow for general assemblies, not an
installed importer or a CAD reconstruction of the reference vehicle.

## Recommended division of work

Keep the editable CAD source as the master. Generate two deliverables from it:
STEP for CAD exchange, and GLB for browser viewing. A small companion JSON file
can identify the movable components and store presentation-specific offsets.

```text
Text / sketch
    -> CAD source (build123d, CadQuery, or a CAD document)
        -> STEP: exact solids and assembly exchange
        -> GLB + presentation JSON: local Three.js viewer
```

For a tool such as [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad),
request a named assembly plus STEP and GLB outputs. Its CAD skill documents STEP
as its primary output and GLB as an available output. Convert/export on the
authoring workstation; copy the finished browser assets to the intranet host.

The viewer can now also open STEP directly: it bundles an OpenCascade wasm kernel
(`occt-import-js`) that tessellates the solids in the browser. That path needs no
conversion step, but it produces a flat list of solids rather than the component
hierarchy, materials and instancing a GLB export preserves. GLB remains the better
viewing copy for a structured assembly; STEP is the quicker path for a one-off look.

## What STEP preserves

STEP can represent parts, nested assemblies, repeated component instances, and
their placements. Names, colours, and other metadata depend on both the export
settings and the receiving application. An export that fuses the shapes, or an
importer that flattens the hierarchy, can lose the separable component structure.

Do not assume a normal STEP exchange preserves native feature history, sketch
constraints, mates, or an exploded animation. Keep the original CAD source for
parametric editing. The viewer should store its own explosion directions and
timing. Some STEP protocols cover additional information, but support varies.

[Open CASCADE's STEP/XDE documentation](https://occt3d.com/dev/doc/overview/html/occt_user_guides__step.html)
describes assembly and metadata translation.
[CadQuery's import/export documentation](https://cadquery.readthedocs.io/en/latest/importexport.html)
describes separate assembly, fused-shape, metadata, and glTF export paths.

## Connecting a GLB to this viewer

1. Export each logical component as its own named node/group. Preserve instances
   and transforms; avoid merging the whole assembly into one mesh.
2. Give each component a stable identifier. Verify these survive conversion;
   display names alone are not always unique or stable between CAD exports.
3. Use Three.js `GLTFLoader` to load the local GLB. Map component identifiers to
   `Object3D` groups, so all meshes belonging to one component move together.
4. Save each group's original local transform. Apply presentation offsets in a
   documented coordinate frame, then restore the original transform on assembly.
5. Normalise units and axes once. Check that a known dimension survives export;
   glTF uses metres, while CAD projects commonly use millimetres.
6. Put the GLB and presentation JSON in the static build. Keep all required assets
   local, including any decoder files if mesh compression is introduced.

The existing `setExplosion(amount)` interface is the animation boundary to reuse.
An imported-model adapter would support `Object3D` groups instead of assuming each
component is one `Mesh`. This adapter has not been implemented in this version.

## Tool choices

- [build123d](https://build123d.readthedocs.io/en/latest/): my first choice for
  readable Python CAD code, explicit geometry, and repeatable parameter changes.
- [CadQuery](https://cadquery.readthedocs.io/en/latest/importexport.html): a strong
  alternative with documented STEP and GLB assembly export workflows.
- [FreeCAD](https://www.freecad.org/features.php): a local graphical CAD editor
  and inspection tool, with Python scripting available.

Three.js remains the presentation layer. Generating a mesh directly in Three.js
is convenient for illustrative models. It does not automatically create an
editable CAD solid or feature tree. An optimised CAD-derived GLB can also be light
and fast in the browser.
