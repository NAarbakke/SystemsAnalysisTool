# Engine cutaways

Open **Engines** in the main navigation or `/engines.html`.

The normal display is an orbitable Three.js cutaway, with metallic surfaces,
visible section faces, studio environment lighting, shadows and selectable parts.
There is no technical-drawing selector. Drag to orbit, scroll to zoom and use Fit
to restore the camera. The Components buttons support keyboard selection.

## Source

- `src/engines/cutaway.ts`: renderer, lighting, camera, picking, cut faces and conceptual models.
- `models/turbofan/model.ts`: existing civilian model used as the turbofan base.
- `src/engines/main.js`: catalogue and inspector interaction.
- The SVG files in this folder provide component metadata and a fallback if WebGL cannot start.

The civilian layout is informed by [NASA's turbofan overview](https://www.grc.nasa.gov/www/k-12/airplane/Animation/turbtyp/etfr.html).
Geometry, materials and proportions are illustrative, in arbitrary scene units.
The rocket cutaways are conceptual visualizations with omitted feed equipment;
they do not provide manufacturing geometry, dimensions or operating telemetry.

Model changes release the previous model's geometry and materials. Rendering
occurs on camera, selection and layout changes; there is no idle rotation.
