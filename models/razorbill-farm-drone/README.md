# Razorbill farm drone

`2000_Razorbill_farm_drone.STEP` is the SolidWorks 2026 export (AP203) of a quadcopter:
a body with base and top plates, a 6S battery, a flight controller and ESC on a spacer stack,
a GPS compass module and a receiver, and four arm sub-assemblies, each with a tube, a motor
mount and leg, a motor and a propeller. `model.ts` loads the file with the viewer's in-browser
CAD kernel. The STEP product tree is kept, so the arms explode as sub-assemblies.

The part numbers in the STEP names become part IDs. STEP carries no materials, so `model.ts`
assigns display finishes by part number. They are an assumption for appearance only, not a
bill of materials.
