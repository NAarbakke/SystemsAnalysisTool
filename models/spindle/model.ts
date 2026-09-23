import { CylinderGeometry, TorusGeometry } from 'three';
import { assemblyBuilder, bearing, box, finish, revolve, ring, around, type Detail } from '../display-details.ts';

/**
 * Belt-driven milling spindle cartridge, nose down. The build follows a common layout:
 * back-to-back angular-contact pair at the nose, a floating rear bearing, and a drawbar
 * clamped by a disc-spring stack. Proportions are illustrative, not a specific product.
 */
export function createSpindle() {
  const { add, done } = assemblyBuilder('Precision spindle');
  const housing = finish('#3b4a55', .35, .42, 'Anodised housing');
  const ground = finish('#c9d0d5', 1, .2, 'Ground steel');
  const bearingSteel = finish('#d7dcdf', 1, .14, 'Bearing steel');
  const oxide = finish('#26292c', .7, .38, 'Black oxide');
  const alloy = finish('#aab3b9', .9, .32, 'Machined aluminium');
  const spring = finish('#6d767c', .9, .3, 'Spring steel');
  const info = (material: string, role: string) => ({ componentInfo: { material, role, source: 'Illustrative layout; not a specific product' } });
  const dark = '#1d2023';

  // Spindle shaft: nose flange, ISO-style taper, bearing seats, threads and a bore for the drawbar.
  add('Spindle shaft', revolve([
    [.3,-2.32],[.5,-2.32],[.5,-2.12],[.34,-2.1],[.34,-1.12],[.3,-1.1],[.3,1.33],[.26,1.35],[.26,2.05],[.22,2.07],[.22,2.52],
    [.17,2.52],[.17,-1.2],[.11,-1.22],[.11,-1.72],[.3,-2.32],
  ]), ground, [2.4,0,0], info('Case-hardened alloy steel', 'Rotating spindle carrying the tool taper'), [
    { geometry: box(.06,.09,.05,.5,-2.22,0), color: dark }, { geometry: box(.06,.09,.05,-.5,-2.22,0), color: dark }, // drive keys
  ]);

  // Housing: cartridge body with a mounting flange, bearing bores and cooling grooves.
  add('Spindle housing', revolve([
    [.62,-1.9],[1.28,-1.9],[1.28,-1.64],[.97,-1.62],[.97,1.9],[.5,1.9],[.5,1.3],[.55,1.28],[.55,-1.24],[.62,-1.26],[.62,-1.9],
  ]), housing, [-2.6,0,0], info('Anodised aluminium alloy', 'Stationary body locating both bearing sets'), [
    ...[-1.2,1.6].map(y => ({ geometry: ring(.95,.972,y,y+.03,.004), color: '#26323a', metalness: .35, roughness: .5 })),
    { geometry: new CylinderGeometry(.07,.07,.1,20).rotateZ(Math.PI/2).translate(1.0,1.55,0), color: '#b8893e' }, // coolant port
    { geometry: new CylinderGeometry(.07,.07,.1,20).rotateZ(Math.PI/2).translate(1.0,-1.35,0), color: '#b8893e' },
  ]);

  // Nose bearings: a back-to-back angular-contact pair with ground spacers between them.
  for (const [name, y0, y1, dy] of [['Front bearing A',-1.88,-1.66,-2.45],['Front bearing B',-1.54,-1.32,-1.75]] as const) {
    const b = bearing(.34,.62,y0,y1);
    add(name, b.outerRing, bearingSteel, [0,dy,0], info('Bearing steel, brass cage', 'Angular-contact nose bearing'), b.details);
  }
  add('Bearing spacer set', ring(.55,.62,-1.66,-1.54,.004), ground, [0,-2.1,0], info('Hardened steel', 'Matched inner and outer spacers setting preload'),
    [{ geometry: ring(.34,.42,-1.66,-1.54,.004), color: '#c9d0d5', metalness: 1, roughness: .2 }]);
  add('Front lock nut', ring(.34,.5,-1.3,-1.16), oxide, [0,-1.35,0], info('Steel, black oxide', 'Clamps the nose bearing inner rings'),
    around(4, () => box(.05,.06,.06,.5,-1.23,0)).map(geometry => ({ geometry, color: '#3a3f44' })));

  // Front cap with a labyrinth seal and six cap screws.
  add('Front cap', revolve([[.38,-2.08],[.9,-2.08],[.92,-2.06],[.92,-1.9],[.62,-1.9],[.62,-1.88],[.52,-1.88],[.52,-1.95],[.38,-1.95],[.38,-2.08]]),
    housing, [0,-3,0], info('Anodised aluminium alloy', 'Clamps the nose bearing outer rings and seals the nose'), [
      ...[.42,.46].map(r => ({ geometry: new TorusGeometry(r,.008,8,160).rotateX(Math.PI/2).translate(0,-2.085,0), color: '#1c252c' })),
      ...around(6, () => new CylinderGeometry(.045,.045,.05,6).translate(.78,-2.1,0), .5).map(geometry => ({ geometry, color: dark })),
    ]);

  // Rear: floating cylindrical-roller bearing, lock nut, end cap and drive pulley.
  const rear = bearing(.26,.5,1.4,1.62,'roller');
  add('Rear bearing', rear.outerRing, bearingSteel, [0,1.3,0], info('Bearing steel, brass cage', 'Floating rear support for thermal growth'), rear.details);
  add('Rear lock nut', ring(.26,.42,1.64,1.76), oxide, [0,1.5,0], info('Steel, black oxide', 'Retains the rear bearing inner ring'));
  add('Rear cap', ring(.3,.9,1.9,2.02,.01), housing, [0,1.8,0], info('Anodised aluminium alloy', 'Closes the rear bore'),
    around(6, () => new CylinderGeometry(.045,.045,.05,6).translate(.78,2.04,0), .5).map(geometry => ({ geometry, color: dark })));
  add('Drive pulley', revolve([[.22,2.1],[.58,2.1],[.58,2.46],[.22,2.46],[.22,2.1]]), alloy, [0,2.3,0], info('Aluminium alloy', 'Poly-V belt pulley taking drive from the motor'),
    Array.from({ length: 8 }, (_, i) => ({ geometry: new TorusGeometry(.585,.018,4,160).rotateX(Math.PI/2).translate(0,2.16+i*.04,0), color: '#8a949b' })));

  // Tool clamping: drawbar, gripper and the disc-spring stack that pulls the tool into the taper.
  add('Drawbar', revolve([[0,-1.7],[.075,-1.7],[.075,2.75],[.1,2.77],[.1,2.9],[0,2.9]]), ground, [4.4,.4,0], info('Alloy steel', 'Pulls the tool holder into the taper'),
    around(4, () => box(.04,.28,.07,.09,-1.56,0), .5).map(geometry => ({ geometry, color: '#8f9aa1' }) as Detail));
  const discs: Detail[] = [];
  for (let i = 1; i < 24; i++) {
    const y = .18 + i*.05, dish = i % 2 ? .016 : -.016; // alternating orientation, as stacked in series
    discs.push({ geometry: revolve([[.082,y-dish],[.162,y+dish],[.162,y+dish+.014],[.082,y-dish+.014],[.082,y-dish]],96), color: '#6d767c', metalness: .9, roughness: .3 });
  }
  add('Disc spring stack', revolve([[.082,.2],[.162,.2+.016],[.162,.2+.03],[.082,.2+.014],[.082,.2]],96), spring, [4.4,.4,0],
    info('Spring steel', 'Series-stacked disc springs holding clamp force'), discs);

  const screws = around(4, () => new CylinderGeometry(.055,.055,.36,24).translate(1.12,-1.82,0), .25);
  screws.forEach((geometry, i) => {
    const a = (i + .25) / 4 * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    add(`Flange screw ${i + 1}`, geometry, oxide, [x*.4,1.5,z*.4], info('Alloy steel, black oxide', 'Fastens the flange to the machine head'),
      [{ geometry: revolve([[.045,-1.64],[.095,-1.64],[.095,-1.52],[.045,-1.52],[.045,-1.64]],48).translate(1.12*x,0,1.12*z), color: dark, metalness: .7, roughness: .38 }]);
  });
  return done();
}
