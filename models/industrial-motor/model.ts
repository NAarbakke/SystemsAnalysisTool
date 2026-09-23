import { CylinderGeometry, TorusGeometry } from 'three';
import { assemblyBuilder, around, bearing, box, finish, revolve, ring, tube, type Detail } from '../display-details.ts';
import type { ComponentReading } from '../../src/component-data.ts';

/**
 * Totally enclosed, fan-cooled squirrel-cage induction motor, foot mounted. Built about a
 * local Y axis that the builder lays horizontal: local -X is world up, local +X toward the feet.
 * Proportions, material assignments and readings are illustrative.
 */
export function createIndustrialMotor() {
  const { add, done } = assemblyBuilder('Industrial electric motor', true);
  const paint = finish('#35505f', .25, .48, 'Painted cast iron');
  const lamination = finish('#5d666b', .85, .38, 'Electrical steel');
  const copper = finish('#b8713a', 1, .32, 'Varnished copper');
  const cast = finish('#b4bcc1', .9, .36, 'Die-cast aluminium');
  const ground = finish('#c8cfd3', 1, .2, 'Ground steel');
  const bearingSteel = finish('#d7dcdf', 1, .14, 'Bearing steel');
  const polymer = finish('#2a2d30', 0, .62, 'Glass-filled polymer');
  const reading = (label: string, value: number, unit: string): ComponentReading => ({ label, value, unit });
  const data = (material: string, role: string, readings: ComponentReading[], partNumber?: string) => ({
    componentInfo: { material, role, partNumber, source: 'Illustrative assignments' },
    operatingDataSource: 'Synthetic snapshot · not measured',
    operatingStages: [{ id: 'snapshot', label: 'Example snapshot', readings }],
  });
  const skip = (a: number, centre: number, half: number) => Math.abs(Math.atan2(Math.sin(a - centre), Math.cos(a - centre))) < half;

  // Frame: finned cast body with feet, spigot recesses at both ends and a lifting eye.
  const fins: Detail[] = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2; // measured from local +X (feet)
    if (skip(a, 0, .55) || skip(a, Math.PI, .32)) continue;
    fins.push({ geometry: box(.17,2.06,.03,1.04,0,0).rotateY(-a), color: '#35505f', metalness: .25, roughness: .48 });
  }
  for (const y of [-.72,.72]) {
    fins.push({ geometry: box(.1,.5,1.9,1.28,y,0), color: '#3a5563', metalness: .25, roughness: .5 });
    for (const z of [-.72,.72]) fins.push({ geometry: box(.34,.42,.12,1.1,y,z), color: '#35505f', metalness: .25, roughness: .48 });
    for (const z of [-.8,.8]) fins.push({ geometry: new CylinderGeometry(.05,.05,.02,20).rotateZ(Math.PI/2).translate(1.34,y,z), color: '#1c2226' });
  }
  fins.push({ geometry: new TorusGeometry(.12,.035,12,48).translate(-1.12,.8,0), color: '#35505f', metalness: .25, roughness: .48 });
  add('Frame', revolve([[.86,-1.15],[.97,-1.15],[1,-1.12],[1,1.12],[.97,1.15],[.86,1.15],[.86,-1.15]]), paint, [-2.3,0,0],
    data('Cast iron, painted', 'Stationary enclosure; conducts heat to the external fins', [reading('Surface temperature',52,'°C'),reading('Vibration RMS',1.1,'mm/s')], 'FR-100L'), fins);

  // Wound stator: laminated core with slot wedges, and the copper end windings with their leads.
  const coreDetail: Detail[] = [];
  for (let i = 0; i < 26; i++) coreDetail.push({ geometry: new TorusGeometry(.861,.0025,3,128).rotateX(Math.PI/2).translate(0,-.75+i*.06,0), color: '#40474b' });
  for (let i = 0; i < 36; i++) coreDetail.push({ geometry: box(.02,1.6,.03,.565,0,0).rotateY(-i/36*Math.PI*2), color: '#2f3437' });
  add('Stator core', ring(.56,.86,-.8,.8,.006), lamination, [0,0,0],
    data('Laminated silicon steel', 'Carries the rotating magnetic field', [reading('Core temperature',71,'°C'),reading('Flux density (peak)',1.5,'T')]), coreDetail);
  const endTurn = (s: number) => revolve([[.6,.8*s],[.82,.8*s],[.845,.92*s],[.8,1.03*s],[.71,1.07*s],[.62,1.02*s],[.6,.92*s],[.6,.8*s]]);
  add('Stator winding', endTurn(-1), copper, [0,0,0],
    data('Enamelled copper, class F varnish', 'Three-phase winding forming the stator poles', [reading('Winding temperature',78,'°C'),reading('Phase current RMS',14.2,'A'),reading('Line voltage',400,'V'),reading('Electrical frequency',50,'Hz')]), [
      { geometry: endTurn(1), color: '#b8713a', metalness: 1, roughness: .32 },
      ...[-.97,-.88,.88,.97].map(y => ({ geometry: new TorusGeometry(.84-(Math.abs(y)-.88)*.4,.008,6,160).rotateX(Math.PI/2).translate(0,y,0), color: '#d9cfb8', metalness: 0, roughness: .8 })),
      ...[-.1,0,.1].map(z => ({ geometry: tube([[-.72,.98,z],[-.9,.7,z],[-1.02,.25,z*.7],[-1.12,.1,z*.5]],.018,32), color: ['#222','#6b4a2a','#7c7f81'][Math.round(z*10)+1], metalness: 0, roughness: .6 })),
    ]);

  // Rotor: laminated core with skewed die-cast bars, end rings and cast-on cooling vanes.
  const rotorDetail: Detail[] = [];
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, skew = .12;
    rotorDetail.push({ geometry: tube(Array.from({ length: 5 }, (_, k) => { const t = k/4, b = a + skew*t; return [.546*Math.cos(b), -.8+1.6*t, .546*Math.sin(b)] as [number,number,number]; }), .007, 8), color: '#b4bcc1', metalness: .9, roughness: .36 });
  }
  for (const s of [-1,1]) {
    rotorDetail.push({ geometry: ring(.3,.54,s>0?.8:-.92,s>0?.92:-.8,.01), color: '#b4bcc1', metalness: .9, roughness: .36 });
    rotorDetail.push(...around(12, () => box(.14,.09,.025,.44,s*.965,0), s > 0 ? 0 : .5).map(geometry => ({ geometry, color: '#b4bcc1', metalness: .9, roughness: .36 })));
  }
  add('Rotor', ring(.2,.545,-.8,.8,.006), lamination, [0,0,2.4],
    data('Silicon steel core, aluminium cage', 'Induced-current squirrel cage producing torque', [reading('Speed',1460,'rpm'),reading('Slip',2.7,'%'),reading('Rotor temperature',86,'°C')]), rotorDetail);

  add('Shaft', revolve([
    [0,-2.25],[.13,-2.25],[.15,-2.23],[.15,-1.46],[.17,-1.44],[.17,-1.12],[.2,-1.1],[.2,1.1],[.17,1.12],[.17,1.45],[.13,1.47],[.13,1.95],[.11,1.97],[0,1.97],
  ]), ground, [0,0,2.4], data('Carbon steel, ground', 'Transmits torque to the driven load', [reading('Speed',1460,'rpm'),reading('Torque',49,'N·m'),reading('Mechanical power',7.5,'kW')]),
    [{ geometry: box(.03,.55,.065,-.14,-1.93,0), color: '#1d2226' }]);
  add('Shaft key', box(.05,.5,.06,-.16,-1.93,0), ground, [-.35,0,2.4], data('Key steel', 'Locates the coupling or pulley on the shaft', [reading('Transmitted torque',49,'N·m')]));

  for (const [name, y0, y1, dy, temperature] of [['Drive-end bearing',-1.38,-1.2,-.7,58],['Non-drive-end bearing',1.2,1.38,.7,54]] as const) {
    const b = bearing(.17,.36,y0,y1);
    add(name, b.outerRing, bearingSteel, [0,dy,2.4],
      data('Bearing steel, steel cage, grease', 'Deep-groove ball bearing supporting the shaft', [reading('Inner-ring speed',1460,'rpm'),reading('Outer-ring temperature',temperature,'°C'),reading('Envelope vibration',.9,'gE')]), b.details);
  }
  add('Preload wave washer', ring(.27,.35,1.39,1.402,.003), ground, [0,1.25,2.4],
    data('Spring steel', 'Axial preload taking up bearing play', [reading('Preload force',380,'N')]));

  // End shields: spigot into the frame, bearing housing, ribs and through-bolts.
  const shield = (s: number, extra: Detail[]) => ({
    geometry: revolve([[.36,1.42],[.46,1.42],[.5,1.36],[.95,1.3],[1,1.27],[1,1.15],[.86,1.15],[.86,1.08],[.8,1.08],[.8,1.2],[.46,1.22],[.42,1.14],[.36,1.14],[.36,1.42]].map(([r,y]) => [r,y*s] as [number,number])),
    details: [
      ...around(8, () => box(.42,.1,.04,.72,1.35*s,0), .5).map(geometry => ({ geometry, color: '#35505f', metalness: .25, roughness: .48 })),
      ...around(4, () => new CylinderGeometry(.04,.04,.06,6).translate(.93,1.3*s,0), .5).map(geometry => ({ geometry, color: '#1c2226' })),
      ...extra,
    ] as Detail[],
  });
  const de = shield(-1, [{ geometry: ring(.15,.21,-1.5,-1.43,.008), color: '#15181a', metalness: 0, roughness: .7 }, { geometry: new CylinderGeometry(.025,.025,.1,12).rotateZ(Math.PI/2).translate(-.52,-1.4,0), color: '#b88a3e' }]);
  add('Drive-end shield', de.geometry, paint, [0,-1.3,0], data('Cast iron, painted', 'Locates the drive-end bearing; V-ring seal and grease nipple', [reading('Surface temperature',49,'°C')]), de.details);
  const nde = shield(1, []);
  add('Non-drive-end shield', nde.geometry, paint, [0,1.3,0], data('Cast iron, painted', 'Locates the floating non-drive-end bearing', [reading('Surface temperature',46,'°C')]), nde.details);

  add('Cooling fan', ring(.13,.2,1.6,1.76,.01), polymer, [0,1.5,2.4], data('Glass-filled polypropylene', 'Bidirectional radial fan blowing air over the fins', [reading('Speed',1460,'rpm'),reading('Air flow',0.11,'m³/s')]), [
    { geometry: ring(.2,.82,1.6,1.625,.006), color: '#2a2d30', metalness: 0, roughness: .62 },
    ...around(10, () => box(.62,.16,.028,.51,1.705,0)).map(geometry => ({ geometry, color: '#2a2d30', metalness: 0, roughness: .62 })),
  ]);
  const grille: Detail[] = [.25,.37,.49,.61,.73,.85,.97].map(r => ({ geometry: new TorusGeometry(r,.014,8,160).rotateX(Math.PI/2).translate(0,1.97,0), color: '#35505f', metalness: .25, roughness: .48 }));
  grille.push(...around(8, () => box(.84,.025,.04,.55,1.97,0)).map(geometry => ({ geometry, color: '#35505f', metalness: .25, roughness: .48 })));
  grille.push({ geometry: new CylinderGeometry(.14,.14,.03,48).translate(0,1.97,0), color: '#35505f', metalness: .25, roughness: .48 });
  add('Fan cowl', revolve([[1.02,1.2],[1.04,1.2],[1.04,1.95],[1,1.99],[.98,1.97],[1.02,1.93],[1.02,1.2]]), paint, [0,2.3,0],
    data('Pressed steel, painted', 'Guides fan air along the frame fins; finger-safe grille', [reading('Inlet air temperature',25,'°C')]), grille);

  add('Terminal box', box(.42,.62,.6,-1.2,0,0), paint, [-3.3,0,0], data('Cast aluminium, painted', 'Houses the supply terminal block and cable entry', [reading('Supply voltage',400,'V'),reading('Enclosure temperature',38,'°C')]), [
    { geometry: box(.05,.68,.66,-1.43,0,0), color: '#3a5563', metalness: .25, roughness: .5 },
    ...[-.26,.26].flatMap(y => [-.27,.27].map(z => ({ geometry: new CylinderGeometry(.03,.03,.02,6).rotateZ(Math.PI/2).translate(-1.46,y,z), color: '#1c2226' }))),
    { geometry: new CylinderGeometry(.07,.08,.14,24).rotateX(Math.PI/2).translate(-1.2,0,.36), color: '#23272a', metalness: .2, roughness: .6 },
  ]);
  return done();
}
