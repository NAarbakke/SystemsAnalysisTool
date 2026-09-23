# Making the engine schematics more realistic

## Current direction: 2D drawings with a gas-path chart

The 3D cutaways have been removed. The engine display is 2D SVG again, and the
turbojet and turbofan use one design: a full mirrored section with a chart
underneath tracing pressure and temperature along the same axial stations, tied
together by station markers 0/2/3/4/5/9 and dotted drop lines. Both traces are
qualitative and carry no values.

This design was chosen from twenty drawn proposals; the others remain available as
alternatives for the rocket diagrams. The notes below are from the earlier reviews
and are kept for the design priorities they record.

## Previous SVG implementation (superseded)

The SVG redesign now includes distinct civilian fan/compressor/turbine profiles,
section hatching, nested shafts, bearing supports, casing joints, a fan front-view
inset, numbered callouts and shared shaded/technical modes. The core and bypass
flow overlays are clipped to authored passage shapes. Selection preserves the
view; panels occupy separate layout space and stack on narrow screens.

The solid illustration now uses opaque material shading and section hatching.
The liquid illustration groups the existing reservoir symbols into an overview
and enlarges the existing conceptual engine section. Neither adds operating or
manufacturing specifications. Unsourced synthetic turbofan readings were removed.

The reference is NASA's generic two-spool turbofan explanation linked below.
This is not a dimensionally matched replica of a named production engine;
exact proportions and stage counts remain illustrative. The original design
priorities below explain the direction of the implemented artwork.

### Verification

Reviewed rendered Chrome screenshots in light/dark themes and technical/shaded
modes, including the embedded Engines tab. Browser checks covered all component
keyboard selections, callout clicks, pan, zoom, Fit, mode switching, and reduced
motion. Layout checks found no panel overflow at 390, 768 and 1280 pixels wide.
The production build and all 47 automated tests passed.

## Main recommendation

Redesign the civilian turbofan first as a carefully drawn side cutaway. Establish its silhouette, internal layout and cut surfaces before adding small details. Use that drawing to set the visual standard for the other diagrams.

The previous fan, compressor and turbine reused one `rows()` shape and mostly
shared one material gradient. The redesign replaces that repetition with separate
geometry helpers and material treatments.

## Priorities

| Priority | Suggested change | What to look for in review |
| --- | --- | --- |
| 1 | Use a public civilian engine cutaway as a proportion reference. Record the source and chosen engine family. | A recognizable silhouette before labels, color or animation are added. |
| 1 | Give the fan, compressor and turbine separate drawing routines. Vary blade profiles, spacing and hub shapes to match the chosen reference. | The three assemblies are distinguishable in grayscale. |
| 1 | Draw the casing as a continuous section with visible wall thickness, consistent cut faces and a clear inlet lip. | No floating edges, accidental gaps or blades crossing the casing. |
| 1 | Make the core and bypass passages easy to follow. Clip flow overlays to their passages. | Airflow stays inside the intended open spaces and remains understandable when paused. |
| 2 | Add restrained depth: dark recessed cavities, narrow edge highlights and shadows where surfaces meet. | One consistent light direction; the drawing remains legible in both themes. |
| 2 | Separate material treatments for outer casing, blades, shaft and hot-section liner. Reserve blue for selection and flow. | Materials remain identifiable without a rainbow of component colors. |
| 2 | Add reference-supported civilian mechanical context: bearing housings, flange joints and a small amount of fastener detail. | Details explain how visible parts connect, and remain subordinate to the main shape. |
| 2 | Replace always-visible labels with numbered callouts and a concise legend; expand the selected callout. | No leader lines crossing labels or covering important geometry. |
| 3 | Add a small front-view inset for the fan after the side section works well. | Blade sweep and hub shape are clearer without mixing perspective into the section drawing. |
| 3 | Offer a clean technical drawing mode and a shaded cutaway mode using the same selectable parts. | Both views retain selection, keyboard access and matching component identities. |

NASA's [turbofan overview](https://www.grc.nasa.gov/www/k-12/airplane/Animation/turbtyp/etfr.html) is a useful reference for the distinction between core and bypass flow. It is a conceptual layout reference, not a source for exact dimensions or manufacturing geometry.

## Suggestions for the other diagrams

- **Solid rocket illustration:** improve the graphic separation of the outer shell, cut material and empty volume. Keep hatching consistent, reduce transparency that makes solid material look hollow, and clean up leader-line placement. Retain the conceptual scope.
- **Liquid rocket illustration:** distinguish the system overview from the engine section. Group the reservoir symbols as an overview inset and give the existing chamber/outlet illustration more page space. Keep omitted equipment explicitly marked; use consistent line weights and material shading.
- **Across all three:** make the engine the dominant visual element. Keep the inspector compact, preserve a stable drawing scale when choosing parts, and avoid heavy selection glow that obscures edges.

## Readings and animation

The previous turbofan displayed fixed synthetic numbers, including a turbine
temperature of 72 °C, without a stated operating condition. These readings have
been removed. Only add operating values when their source, condition and
measurement location are available.

Keep airflow as an optional explanatory overlay. Do not use decorative motion as evidence of a physical simulation.

## Suggested implementation order

1. Compare a grayscale turbofan redraw with its chosen reference at the same viewing angle.
2. Check internal boundaries and part selection, then add shading and callouts.
3. Review screenshots in light and dark themes at desktop and narrow widths. Check Fit, zoom, pan, keyboard selection and reduced motion.
4. Apply the agreed illustration style to the two conceptual rocket diagrams.

Keep SVG for this first pass: it already supports selectable, scalable parts. A later 3D render could provide an illustration background, but would need matching selection regions and additional assets.

## Files involved

- `models/engine-diagrams/turbofan/model.js`: civilian turbofan layout.
- `models/engine-diagrams/shared.js`: component groups, callouts and repeated shapes.
- `models/engine-diagrams/views.js`: SVG composition order.
- `src/engines/style.css`: material, line, selection and layout styling.
- `src/engines/main.js`: selection, fit, pan and zoom.

[Back to the user guide](../README.md)

