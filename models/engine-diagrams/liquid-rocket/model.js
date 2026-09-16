import { component } from '../shared.js';
const chamber = '<path class="warm-part" d="M625 225H721Q764 225 785 260L798 280V296L785 316Q764 351 721 351H625Q587 351 587 314V262Q587 225 625 225Z"/><path class="gas-volume" d="M631 245H718Q750 245 768 271L780 288 768 305Q750 331 718 331H631Q608 331 608 309V267Q608 245 631 245Z"/><path class="surface-line" d="M625 234H719 M625 342H719"/>';
const nozzle = '<path class="shell" d="M772 246Q803 277 829 262Q943 190 1061 164V189Q949 217 838 278Q800 299 781 277Z M772 330Q803 299 829 314Q943 386 1061 412V387Q949 359 838 298Q800 277 781 299Z"/><path class="nozzle-inset" d="M785 257Q806 285 834 270Q956 201 1050 178 M785 319Q806 291 834 306Q956 375 1050 398"/>';
// Existing conceptual section, enlarged as an illustration; no added feed-system design.
export default {
 id:'liquid',name:'Liquid rocket',badge:'Liquid rocket · conceptual section',
 note:'System overview and engine section shown at different illustration scales. Feed equipment omitted; no operating telemetry.',
 description:'The reservoirs are grouped in a system overview. The enlarged section shows the conceptual chamber and outlet.',
 parts:[
  component('fuel','Fuel reservoir','Conceptual reservoir symbol in the system overview.',
   '<g transform="translate(4 80) scale(.72)"><rect class="reservoir" x="124" y="135" width="225" height="120" rx="57"/><path class="fuel-fill" d="M139 191Q186 183 237 191T334 191V196Q334 241 288 241H186Q139 241 139 196Z"/><path class="tank-shine" d="M151 173Q159 149 191 149H278"/></g>',[150,100,170,179]),
  component('oxidizer','Oxidizer reservoir','Conceptual reservoir symbol in the system overview.',
   '<g transform="translate(4 80) scale(.72)"><rect class="reservoir" x="124" y="321" width="225" height="120" rx="57"/><path class="oxidizer-fill" d="M139 377Q186 369 237 377T334 377V382Q334 427 288 427H186Q139 427 139 382Z"/><path class="tank-shine" d="M151 359Q159 335 191 335H278"/></g>',[150,461,170,397]),
  component('feed','Feed connections','Schematic connections. The marked break stands for equipment omitted from this overview.',
   '<path class="feed-underlay" d="M255 220H292V257H444 M255 355H292V307H444"/><path class="fuel-line" d="M255 220H292V257H444"/><path class="oxidizer-line" d="M255 355H292V307H444"/><rect class="feed-break" x="331" y="239" width="51" height="87" rx="6"/><path class="break-mark" d="M343 257H370 M343 308H370"/>',[356,135,356,239]),
  component('chamber','Chamber','Conceptual combustion volume in an enlarged illustrative section.',`<g transform="translate(-290 -72) scale(1.25)">${chamber}</g>`,[537,455,545,347]),
  component('nozzle','Nozzle','Illustrative outlet silhouette, shown with a shaded inner surface.',`<g transform="translate(-290 -72) scale(1.25)">${nozzle}</g>`,[940,80,954,161])
 ],
 background:'<rect class="overview-frame" x="58" y="143" width="225" height="278" rx="16"/><text class="zone-label" x="170" y="441">SYSTEM OVERVIEW</text><path class="centerline" d="M418 288H1100"/><text class="zone-label" x="356" y="355">OMITTED</text><text class="zone-label" x="773" y="476">ENLARGED SECTION</text>',flow:''
};
