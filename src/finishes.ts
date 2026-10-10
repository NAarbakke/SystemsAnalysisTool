import { Color, DoubleSide, MeshPhysicalMaterial, SRGBColorSpace, type MeshPhysicalMaterialParameters } from 'three';

/** Colour shared by every cut face of a cutaway, so sections read as sections. */
export const SECTION_COLOR = '#74192b';

export type Finish = (overrides?: MeshPhysicalMaterialParameters) => MeshPhysicalMaterial;
/** Double-sided so cutaway shells show their inner faces. Each call makes a material the caller owns. */
function define(name: string, color: string, metalness: number, roughness: number, extra: MeshPhysicalMaterialParameters = {}): Finish {
  return overrides => new MeshPhysicalMaterial({ name, color, metalness, roughness, side: DoubleSide, ...extra, ...overrides });
}
const lacquer = (clearcoat: number, clearcoatRoughness: number) => ({ clearcoat, clearcoatRoughness });

/**
 * Named surface finishes. Bare metals differ mainly in roughness and tint; paints and composites
 * are dielectrics under a clear coat, which is what gives them a soft highlight instead of a mirror.
 */
export const finishes = {
  steel: define('Steel', '#b8c0c5', 1, .24),
  groundSteel: define('Ground steel', '#c8cfd3', 1, .2),
  bearingSteel: define('Bearing steel', '#d7dcdf', 1, .14),
  springSteel: define('Spring steel', '#6d767c', .9, .3),
  electricalSteel: define('Electrical steel', '#5d666b', .85, .38),
  blackOxide: define('Black oxide', '#24272a', .75, .4),
  zinc: define('Zinc plated', '#c3c9cc', 1, .3),
  castAluminium: define('Cast aluminium', '#b4bcc1', .9, .46),
  machinedAluminium: define('Machined aluminium', '#aab3b9', .9, .3),
  anodised: define('Anodised aluminium', '#3b4a55', .55, .4),
  titanium: define('Titanium', '#a3abb1', .95, .26),
  nickel: define('Nickel alloy', '#8d8274', .9, .36),
  copper: define('Copper', '#b8713a', 1, .32),
  bronze: define('Bronze', '#b0873e', .9, .34),
  paint: define('Paint', '#d0d5d9', 0, .42, lacquer(.5, .25)),
  castPaint: define('Painted casting', '#35505f', 0, .6, lacquer(.12, .5)),
  composite: define('Composite', '#22262a', 0, .5, lacquer(1, .18)),
  polymer: define('Polymer', '#2a2d30', 0, .62),
  rubber: define('Rubber', '#15181a', 0, .85),
  section: define('Section face', SECTION_COLOR, 0, .7),
} satisfies Record<string, Finish>;

/** First match wins, so the specific words come before the generic ones. */
const BY_NAME: [RegExp, Finish][] = [
  [/\b(o ?ring|seal|gasket|rubber|tyre|tire|belt|boot|grommet)s?\b/, finishes.rubber],
  [/\b(bearing|race|ball|roller)s?\b/, finishes.bearingSteel],
  [/\b(bolt|screw|nut|washer|stud|rivet|fastener|circlip|dowel)s?\b/, finishes.zinc],
  [/\b(winding|coil|busbar|copper)s?\b/, finishes.copper],
  [/\b(bush|bushing|brass|bronze|fitting)s?\b/, finishes.bronze],
  [/\b(spring)s?\b/, finishes.springSteel],
  [/\b(nozzle|chamber|combustor|turbine|exhaust|manifold|preburner)s?\b/, finishes.nickel],
  [/\b(shaft|spindle|axle|pin|rod|piston|crank|gear|sprocket)s?\b/, finishes.groundSteel],
  [/\b(pcb|board|connector|cable|plug|cap|knob|handle)s?\b/, finishes.polymer],
  [/\b(housing|case|casing|body|frame|bracket|cover|block|plate|flange|mount)s?\b/, finishes.castAluminium],
];

/**
 * Finish for tessellated CAD that carries no material: STEP gives at most a colour and a name.
 * The name picks the finish; an authored colour is kept and decides only between bare metal
 * (greys), black oxide (near black) and paint (anything saturated) when the name says nothing.
 */
export function inferFinish(name: string, rgb?: number[]) {
  const named = BY_NAME.find(([words]) => words.test(name.toLowerCase().replace(/[^a-z]+/g, ' ')))?.[1];
  if (!rgb) return (named ?? finishes.machinedAluminium)();
  const color = new Color().setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);
  if (named) return named({ color });
  const max = Math.max(rgb[0], rgb[1], rgb[2]), min = Math.min(rgb[0], rgb[1], rgb[2]);
  if (max - min > .12) return finishes.paint({ color });
  return (max < .2 ? finishes.blackOxide : finishes.machinedAluminium)({ color });
}
