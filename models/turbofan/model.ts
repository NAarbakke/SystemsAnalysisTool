import { CylinderGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assemblyBuilder, around, bladeRow, box, finish, hoop, revolve, ring, tube, type Detail } from '../display-details.ts';

type Stage = { y: number; hub: number; tip: number; count: number; chord: number; rotor: boolean };

/**
 * Civilian two-spool high-bypass turbofan, cut away. Modules follow the usual build: fan and
 * booster on the low-pressure spool, a multi-stage high-pressure compressor and turbine on the
 * high-pressure spool, an annular combustor between them. Arbitrary units; blade counts, stage
 * counts and shapes are illustrative, not aerodynamic or performance data.
 */
export function createTurbofan() {
  const { add, done } = assemblyBuilder('Civilian turbofan cutaway', true);
  // Local Y is the engine axis (world X, +Y aft). Shells leave a quarter open toward the default view.
  const arc = Math.PI * 1.5, start = Math.PI * .25 - .42;
  const cut = (profile: [number, number][], segments = 160) => revolve(profile, segments, arc, start);
  const titanium = finish('#a3abb1', .95, .26, 'Titanium');
  const composite = finish('#2c3136', .2, .45, 'Composite');
  const nickel = finish('#8d8274', .9, .36, 'Nickel alloy');
  const painted = finish('#d9dde0', .15, .36, 'Painted nacelle');
  const steel = finish('#b8c0c5', 1, .24, 'Steel');
  const info = (material: string, role: string) => ({ componentInfo: { material, role, source: 'Illustrative geometry; not design data' } });
  const detail = (geometry: BufferGeometry, color: string, metalness = .9, roughness = .3): Detail => ({ geometry, color, metalness, roughness });
  const rows = (list: Stage[], hot = false) => mergeGeometries(list.map(s => bladeRow({
    count: s.count, hub: s.hub, tip: s.tip, y: s.y, chord: [s.chord, s.chord * .88],
    stagger: hot ? (s.rotor ? [-.9, -1.05] : [.75, .8]) : (s.rotor ? [.55, .95] : [-.35, -.45]),
    camber: hot ? (s.rotor ? -.12 : .1) : (s.rotor ? .05 : -.06), thickness: hot ? .16 : .09,
  })))!;

  add('Spinner', revolve([[0,-3.35],[.08,-3.3],[.2,-3.12],[.3,-2.9],[.37,-2.7],[.39,-2.58],[0,-2.58]]), steel, [0,-3,0],
    info('Aluminium alloy', 'Streamlines the fan hub; the spiral shows rotation to ground crews'),
    [detail(tube(Array.from({ length: 12 }, (_, i) => { const t = i / 11, r = .04 + .34 * Math.sin(t * Math.PI / 2), a = t * 3.2; return [r * Math.cos(a), -3.32 + .72 * t, r * Math.sin(a)] as [number,number,number]; }), .012, 64), '#1b1e21', .2, .5)]);

  // Fan: wide-chord swept blades with strong hub-to-tip twist, on a disc with a platform ring.
  add('Fan', bladeRow({ count: 22, hub: .42, tip: 1.62, y: -2.4, chord: [.5, .72], stagger: [.35, 1.12], camber: .07, thickness: .06, sweep: -.12, lean: .08 }),
    titanium, [0,-2.1,0], info('Hollow titanium blades, titanium disc', 'Low-pressure spool fan; most of the thrust comes from its bypass stream'),
    [detail(ring(.2,.43,-2.62,-2.18,.02), '#8c959b'), detail(ring(.4,.44,-2.7,-2.1,.01), '#b3bbc0')]);

  add('Fan case', cut([[1.65,-2.9],[1.75,-2.9],[1.75,-1.3],[1.68,-1.3],[1.66,-2.1],[1.64,-2.7],[1.65,-2.9]]), composite, [0,-.5,-3.8],
    info('Carbon composite with aramid containment wrap', 'Contains the fan; carries the abradable rub strip and the outlet guide vanes'), [
      detail(cut([[1.635,-2.62],[1.66,-2.62],[1.66,-2.18],[1.635,-2.18],[1.635,-2.62]]), '#7b7f82', .1, .7),
      ...[-2.88,-1.32].map(y => detail(cut([[1.75,y-.02],[1.81,y-.02],[1.81,y+.02],[1.75,y+.02],[1.75,y-.02]]), '#5c6166')),
    ]);

  add('Outlet guide vanes', bladeRow({ count: 40, hub: .96, tip: 1.67, y: -1.72, chord: [.26, .3], stagger: [-.25, -.3], camber: -.08, thickness: .08 }),
    composite, [0,-1.3,0], info('Composite vanes', 'Straighten the fan swirl in the bypass stream'));

  // Booster (low-pressure compressor) inside the splitter that divides bypass and core flow.
  add('Booster', rows([.62,.575,.53].flatMap((tip, i) => [
    { y: -1.95 + i*.19, hub: .42, tip, count: 44, chord: .1, rotor: true },
    { y: -1.86 + i*.19, hub: .44, tip, count: 52, chord: .08, rotor: false }])),
    titanium, [0,-.75,0], info('Titanium blades, steel vanes', 'Three-stage low-pressure compressor supercharging the core'),
    [detail(revolve([[.3,-2.05],[.43,-2.05],[.43,-1.4],[.3,-1.4],[.3,-2.05]]), '#7c858b'),
     detail(cut([[.64,-2.08],[.8,-2.15],[.95,-2.03],[.97,-1.3],[.9,-1.28],[.56,-1.38],[.64,-2.08]]), '#aab2b7')]);

  // High-pressure compressor: nine stages on a drum rotor, blade height shrinking toward the rear.
  const hpc = Array.from({ length: 9 }, (_, i) => ({ y: -1.18 + i*.14, tip: .52 - i*.015, hub: .26 + i*.008, i }));
  add('High-pressure compressor', rows(hpc.flatMap(s => [
    { y: s.y, hub: s.hub, tip: s.tip, count: 36 + s.i*3, chord: .07, rotor: true },
    { y: s.y + .065, hub: s.hub + .015, tip: s.tip, count: 48 + s.i*3, chord: .055, rotor: false }])),
    titanium, [0,0,0], info('Titanium front stages, nickel rear stages', 'Nine-stage axial compressor on the high-pressure spool'),
    [detail(revolve([[.2,-1.24],[.26,-1.24],[.33,.06],[.2,.06],[.2,-1.24]]), '#7c858b'),
     ...hpc.map(s => detail(hoop(s.hub + .004, s.y + .035, .008), '#62696e'))]);

  // Core casing: follows the blade tips from the compressor to the turbine exit.
  const inside: [number,number][] = [[.53,-1.25],[.41,.04],[.6,.12],[.6,.82],[.58,.86],[.58,1.28],[.645,1.33],[.79,2]];
  add('Core casing', cut([...inside, ...inside.map(([r,y]) => [r + .035, y] as [number,number]).reverse(), inside[0]]), steel, [-1.7,.3,0],
    info('Steel and nickel alloy casings', 'Pressure casing of the core; carries vane rows and bleed manifolds'), [
      ...[[.52,-.9],[.47,-.4]].map(([r,y]) => detail(hoop(r,y,.028,arc,start), '#7a8288')),
      ...[[.66,.95],[.71,1.6]].map(([r,y]) => detail(hoop(r,y,.03,arc,start), '#6f675c')),
    ]);

  // Annular combustor: outer and inner liners joined by the dome, with fuel nozzles.
  add('Combustor', cut([[.56,.2],[.56,.78],[.53,.78],[.53,.24],[.39,.24],[.39,.78],[.36,.78],[.36,.2],[.46,.13],[.56,.2]]), nickel, [0,.7,0],
    info('Nickel alloy liners, thermal barrier coating', 'Burns fuel in the compressed air at near-constant pressure'), [
      ...around(18, () => tube([[.62,.02,0],[.54,.08,0],[.47,.15,0]], .016, 16)).map(g => detail(g, '#c2c7ca', 1, .2)),
      ...[.36,.5,.64].flatMap(y => [detail(hoop(.562,y,.005,arc,start), '#5c554b'), detail(hoop(.358,y,.005,arc,start), '#5c554b')]),
    ]);

  add('High-pressure turbine', rows([
    { y: .86, hub: .36, tip: .57, count: 40, chord: .1, rotor: false }, { y: .98, hub: .36, tip: .57, count: 60, chord: .09, rotor: true },
    { y: 1.1, hub: .36, tip: .57, count: 44, chord: .09, rotor: false }, { y: 1.22, hub: .36, tip: .57, count: 64, chord: .08, rotor: true }], true),
    nickel, [0,1.3,0], info('Single-crystal nickel blades, powder-metal discs', 'Two-stage turbine driving the high-pressure compressor'),
    [detail(revolve([[.14,.92],[.36,.92],[.36,1.28],[.14,1.28],[.14,.92]]), '#6e675d')]);

  const lpt = Array.from({ length: 5 }, (_, i) => ({ y: 1.38 + i*.12, tip: .63 + i*.03 }));
  add('Low-pressure turbine', rows(lpt.flatMap(s => [
    { y: s.y, hub: .38, tip: s.tip, count: 70, chord: .065, rotor: false },
    { y: s.y + .06, hub: .38, tip: s.tip, count: 84, chord: .06, rotor: true }]), true),
    nickel, [0,1.9,0], info('Nickel alloy blades and discs', 'Five-stage turbine driving the fan and booster through the inner shaft'),
    [detail(revolve([[.12,1.32],[.38,1.32],[.38,1.98],[.12,1.98],[.12,1.32]]), '#6e675d')]);

  add('Low-pressure shaft', revolve([[0,-2.2],[.1,-2.2],[.1,2.3],[0,2.3]], 96), steel, [1.5,0,0],
    info('Maraging steel', 'Inner shaft linking the low-pressure turbine to the fan'),
    [detail(ring(.1,.2,-1.3,-1.12,.01), '#d7dcdf', 1, .15), detail(ring(.1,.14,2.05,2.2,.01), '#d7dcdf', 1, .15)]);

  add('Exhaust cone and nozzle', revolve([[.4,2.02],[.3,2.4],[.1,2.95],[0,3],[0,2.02],[.4,2.02]]), nickel, [0,2.7,0],
    info('Nickel alloy', 'Core exhaust plug and nozzle; rear-frame struts carry the aft bearing'), [
      detail(cut([[.79,2],[.83,2],[.67,2.75],[.63,2.75],[.79,2]]), '#77706a'),
      ...around(12, () => box(.36,.3,.018,.58,2.1,0)).map(g => detail(g, '#6e675d')),
    ]);

  // Nacelle: inlet lip, fan cowl and thrust-reverser sleeve to the bypass nozzle, cut open.
  add('Nacelle', cut([
    [1.72,-3.3],[1.84,-3.34],[1.93,-3.25],[1.97,-2.9],[1.98,-1.6],[1.9,-.2],[1.72,.9],[1.6,1.1],[1.55,1.05],[1.62,.3],[1.72,-.9],[1.82,-1.3],[1.82,-2.9],[1.72,-3.12],[1.72,-3.3],
  ], 192), painted, [0,0,-3.8], info('Aluminium lip, composite cowls', 'Aerodynamic enclosure; the aft sleeve houses the thrust reverser'),
    [-1.6,-.3].map(y => { const r = 1.98 - (y + 1.6) * .06; return detail(cut([[r-.005,y-.008],[r+.012,y-.008],[r+.012,y+.008],[r-.005,y+.008],[r-.005,y-.008]], 192), '#9aa2a8', .3, .4); }));

  // Core-mounted accessory gearbox below the compressor, driven by a radial shaft.
  add('Accessory gearbox', box(.18,.62,.34,.74,-.62,0), steel, [2.2,0,0], info('Aluminium housing', 'Drives fuel, oil and generator from the high-pressure spool'), [
    detail(new CylinderGeometry(.022,.022,.4,16).rotateZ(Math.PI/2).translate(.45,-1.1,0), '#c2c7ca', 1, .2),
    ...[-.8,-.45].map(y => detail(new CylinderGeometry(.08,.08,.14,32).rotateZ(Math.PI/2).translate(.88,y,0), '#6c7479')),
  ]);
  return done();
}
