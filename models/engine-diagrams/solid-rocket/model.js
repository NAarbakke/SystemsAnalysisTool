import { component } from '../shared.js';
export default {
 id:'solid', name:'Solid rocket', badge:'Solid rocket · conceptual section', note:'Conceptual sections only · no operating telemetry',
 parts:[
 component('case','Motor case','Outer enclosure',
 '<path class="shell" d="M226 157H781Q804 157 812 184L827 222 810 232 795 191Q792 178 777 178H226Q164 178 164 240V320Q164 382 226 382H777Q792 382 795 369L810 328 827 338 812 376Q804 403 781 403H226Q142 403 142 320V240Q142 157 226 157Z"/><path class="surface-line" d="M225 165H775 M225 395H775"/><path class="section-edge" d="M222 179H777 M222 381H777"/>',[310,85,310,165]),
 component('propellant','Solid propellant','Stored solid propellant; generic cutaway',
 '<path class="propellant" d="M229 192H772V242H229Q188 242 188 272V235Q188 192 229 192Z M229 318H772V368H229Q188 368 188 325V288Q188 318 229 318Z"/><path class="hatch-fill" d="M229 192H772V242H229Q188 242 188 272V235Q188 192 229 192Z M229 318H772V368H229Q188 368 188 325V288Q188 318 229 318Z"/><path class="surface-line" d="M229 203H757 M229 357H757"/>',[440,475,440,344]),
 component('chamber','Internal volume','Conceptual gas volume',
 '<path class="gas-volume" d="M228 251H781L824 266V294L781 309H228Q197 309 197 280Q197 251 228 251Z"/><path class="volume-line" d="M246 263H745 M246 297H745"/>',[627,85,627,281]),
 component('nozzle','Nozzle','Illustrative outlet silhouette',
 '<path class="shell" d="M794 185Q835 195 851 246Q862 263 890 247Q963 203 1050 184V211Q969 232 893 269Q857 287 838 264L815 222Z M794 375Q835 365 851 314Q862 297 890 313Q963 357 1050 376V349Q969 328 893 291Q857 273 838 296L815 338Z"/><path class="nozzle-inset" d="M811 209Q840 231 850 257Q864 277 892 258Q975 217 1039 199 M811 351Q840 329 850 303Q864 283 892 302Q975 343 1039 361"/>' ,[930,475,960,337])
 ],
 background:'<path class="centerline" d="M80 280H1110"/><path class="diagram-bracket" d="M148 427V436H807V427"/><text class="zone-label" x="480" y="454">LONGITUDINAL CUTAWAY</text>', flow:''
};

