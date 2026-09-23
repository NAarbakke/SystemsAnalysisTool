# Engine schematics

Open **Engines** in the main navigation or `/engines.html`.

The display is a 2D SVG drawing on a 1200 × 560 canvas. Drag to pan, scroll or use
**+ / −** to zoom, and use **Fit** to restore the view. Click a part, or use the
Components buttons, to select it; the buttons also support keyboard selection.

## Two kinds of model

- **Authored drawings** (`turbojet`, `turbofan`) keep their markup and styling in
  `<id>/drawing.js`, generated from a reviewed SVG source. `<id>/model.js` adds the
  catalogue entry and the component descriptions. Every selectable group carries
  `data-part`, and all styling is scoped under `#<id>-tp` so drawings cannot
  collide with each other or with the page.
- **Composed drawings** (`solid-rocket`, `liquid-rocket`) build their markup from
  part geometry through `shared.js` and `views.js`, styled by `src/engines/style.css`.

The turbojet and turbofan drawings pair a full mirrored section with a chart
tracing pressure and temperature along the same axial stations. Both traces are
qualitative: there are no operating values, and stage counts and proportions are
illustrative. The turbofan layout is informed by
[NASA's turbofan overview](https://www.grc.nasa.gov/www/k-12/airplane/Animation/turbtyp/etfr.html).
The rocket drawings remain conceptual, with feed equipment omitted.

## Source

- `src/engines/main.js`: catalogue, selection, pan and zoom.
- `src/engines/style.css`: layout, and the styling for composed drawings.
- `<id>/model.js`: one entry in the Model menu, with its component list.
