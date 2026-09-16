import { component } from '../shared.js';
import { fan, compressor, turbine, bearings, frontInset } from './geometry.js';

const nacelle = 'M100 150Q104 112 153 110L496 116Q641 118 765 162L939 220L932 234L753 184Q631 143 493 143L156 135Q128 135 127 154Z M100 410Q104 448 153 450L496 444Q641 442 765 398L939 340L932 326L753 376Q631 417 493 417L156 425Q128 425 127 406Z';
const coreCase = 'M263 211Q310 181 360 183L587 216Q660 210 714 218L887 190L943 226L936 235L884 203L715 230Q657 222 590 229L359 196Q310 194 269 221Z M263 349Q310 379 360 377L587 344Q660 350 714 342L887 370L943 334L936 325L884 357L715 330Q657 338 590 331L359 364Q310 366 269 339Z';
const bypass = 'M132 151L248 150Q473 138 598 160L754 195L930 240L950 235L1024 260L941 249L754 208L598 178Q443 160 268 204L132 230Z M132 409L248 410Q473 422 598 400L754 365L930 320L950 325L1024 300L941 311L754 352L598 382Q443 400 268 356L132 330Z';
const coreFlow = 'M268 222Q310 201 359 199L590 232Q660 223 715 232L885 207L939 239L1060 268L930 265L887 253L725 254L588 253L354 243L268 258Z M268 338Q310 359 359 361L590 328Q660 337 715 328L885 353L939 321L1060 292L930 295L887 307L725 306L588 307L354 317L268 302Z';

export default {
 id:'turbofan', name:'Civilian turbofan', badge:'Civilian turbofan · cutaway',
 note:'Generic two-spool illustration. Proportions and stage counts are illustrative; no operating telemetry.',
 description:'Orbit the cutaway to inspect the inlet fan, smaller core and surrounding bypass passage. Select a component to highlight it.',
 reference:'https://www.grc.nasa.gov/www/k-12/airplane/Animation/turbtyp/etfr.html',
 defs:`<defs><clipPath id="bypass-flow-clip"><path d="${bypass}"/></clipPath><clipPath id="core-flow-clip"><path d="${coreFlow}"/></clipPath></defs>`,
 parts:[
  component('casing','Nacelle','Rounded inlet lip and outer enclosure surrounding the bypass passage.',
   `<path class="shell" d="${nacelle}"/><path class="section-hatch" d="${nacelle}"/><path class="surface-line" d="M116 141Q125 123 157 122L493 128Q635 130 761 174L932 228 M116 419Q125 437 157 438L493 432Q635 430 761 386L932 332"/>`+
   [270,480].map((x,i)=>`<path class="joint-line" d="M${x} ${114+i*3}V140 M${x} ${446-i*3}V420"/><circle class="fastener" cx="${x+8}" cy="129" r="2"/><circle class="fastener" cx="${x+8}" cy="431" r="2"/>`).join(''),[415,65,415,127]),
  component('fan','Fan & spinner','Broad swept blades and a rounded spinner form the inlet rotating assembly.',fan()+frontInset(),[145,492,204,392]),
  component('core-case','Core casing','A separate inner casing defines the core passage and supports the stationary blade rows.',
   `<path class="shell" d="${coreCase}"/><path class="section-hatch" d="${coreCase}"/>`+
   [368,581,714].map((x,i)=>`<rect class="flange" x="${x}" y="${[182,211,215][i]}" width="9" height="18" rx="1"/><rect class="flange" x="${x}" y="${[360,331,327][i]}" width="9" height="18" rx="1"/>`).join(''),[558,106,558,217]),
  component('compressor','Compressor','Closely spaced curved rotor blades alternate with stationary vanes. The illustrated passage narrows toward the combustor.',compressor(),[417,475,432,337]),
  component('chamber','Combustor','The section reveals an annular liner around the central shaft passage.',
   '<path class="warm-part" d="M589 232Q639 211 696 232L719 250H593Z M589 328Q639 349 696 328L719 310H593Z"/><path class="liner" d="M605 235Q647 223 692 238L704 245H607Z M605 325Q647 337 692 322L704 315H607Z"/><path class="chamber-detail" d="M620 232L674 233 M620 328L674 327"/>',[664,76,658,233]),
  component('turbine','Turbine','Shorter, broader blade profiles distinguish the hot-section rotors from the compressor. The two spools connect through nested shafts.',turbine(),[795,475,800,339]),
  component('shaft','Nested shafts','The inner fan shaft passes through the hollow core shaft; the two rotating assemblies are shown concentrically.',
   '<path class="shaft-body" d="M290 263H781V272H290Z M290 288H781V297H290Z"/><rect class="inner-shaft" x="230" y="276" width="683" height="8" rx="3"/><path class="surface-line" d="M303 267H770 M242 278H899"/>',[584,495,565,280]),
  component('bearings','Bearing supports','Illustrative bearing races and housings provide visible support around the shafts.',bearings(),[291,452,284,305]),
  component('exhaust','Exhaust cone','A tapered tail cone finishes the core, with the outlet passage visible around it.',
   '<path class="spinner" d="M908 251Q964 255 1080 280Q964 305 908 309Z"/><path class="surface-line" d="M921 260L1054 280 M921 300L1054 280"/>',[1004,452,1000,291])
 ],
 background:`<path class="duct-volume" d="${bypass}"/><path class="core-volume" d="${coreFlow}"/><path class="centerline" d="M50 280H1125"/><text class="zone-label" x="455" y="166">BYPASS</text>`,
 flow:'<g clip-path="url(#bypass-flow-clip)"><path d="M132 182Q400 146 603 170L1015 258 M132 378Q400 414 603 390L1015 302"/></g><g class="core-airflow" clip-path="url(#core-flow-clip)"><path d="M268 239Q332 207 425 230L590 244Q646 227 716 243L887 230L1060 274 M268 321Q332 353 425 330L590 316Q646 333 716 317L887 330L1060 286"/></g>'
};


