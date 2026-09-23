import drawing from './drawing.js';

export default {
 id:'turbofan', name:'Turbofan', badge:'Two-spool turbofan · section and gas-path chart',
 note:"The chart shows the qualitative shape of pressure and temperature along the core, with a separate bypass pressure trace. Stage counts, proportions and curve shapes are illustrative; there are no operating values.",
 description:"A full section of a high-bypass two-spool turbofan, with the core and bypass streams traced along the same axial stations underneath. Select a component to highlight it.",
 svg:drawing, flow:'',
 parts:[
 { id:'nacelle', name:"Nacelle and inlet", role:"The outer cowl that houses the fan and forms the intake. Its rounded lip and diffusing inner wall slow the incoming air and deliver it to the fan face at a steady, uniform velocity, and the inner surface carries acoustic lining to absorb fan noise.", readings:[] },
 { id:'spinner', name:"Spinner", role:"The rotating cone on the front of the fan disc. It splits the incoming air smoothly around the blade roots and sheds ice and water outward, away from the core intake.", readings:[] },
 { id:'fan', name:"Fan", role:"The large first rotor, driven by the LP turbine through the inner shaft. It raises the pressure of a very large mass of air by a modest amount; most of that air goes around the core as bypass flow and produces the bulk of the thrust.", readings:[] },
 { id:'outlet-guide-vanes', name:"Fan outlet guide vanes", role:"Stationary vanes immediately behind the fan in the bypass passage. They remove the swirl the fan imparts, converting it into useful pressure rise, and they also brace the core to the nacelle.", readings:[] },
 { id:'bypass-duct', name:"Bypass duct and fan nozzle", role:"The annular passage between the nacelle and the core cowl that carries the bypass stream aft. The air in it is never burned: it simply loses a little pressure to duct friction and then expands through the fan nozzle to produce thrust.", readings:[] },
 { id:'lp-compressor', name:"LP compressor (booster)", role:"The small stages behind the fan root, mounted on the same inner shaft as the fan. They give the core stream a first stage of compression before it reaches the HP compressor, and they turn at fan speed.", readings:[] },
 { id:'hp-compressor', name:"HP compressor", role:"The main compressor of the core, driven by the HP turbine through the outer hollow shaft. Its many stages take most of the pressure rise; blades and annulus shrink stage by stage as the air becomes denser, and the air leaves it hot from compression alone.", readings:[] },
 { id:'combustor', name:"Annular combustor", role:"The ring-shaped chamber where fuel is sprayed into the compressed core air and burned continuously. Temperature climbs steeply here while pressure stays almost constant, dropping only slightly through the liner and diffuser losses.", readings:[] },
 { id:'hp-turbine', name:"HP turbine", role:"The first turbine behind the combustor, taking the hottest gas in the engine. It extracts just enough work to drive the HP compressor on the outer shaft, and its nozzle guide vanes and blades are cooled to survive the gas temperature.", readings:[] },
 { id:'lp-turbine', name:"LP turbine", role:"The multi-stage turbine downstream of the HP turbine, connected to the fan and booster by the inner shaft. Because it must drive the large fan, it takes a lot of work from the gas: its blades grow taller stage by stage as the gas expands and cools.", readings:[] },
 { id:'shafts', name:"Concentric spool shafts", role:"Two independent shafts running one inside the other. The inner shaft links the fan, booster and LP turbine as the low-pressure spool; the outer hollow shaft links the HP compressor and HP turbine as the high-pressure spool, so each spool can settle at its own best speed.", readings:[] },
 { id:'bearings', name:"Shaft bearings", role:"The bearings that locate each spool radially and axially and carry its loads into the static structure. They also keep the two concentric shafts running true relative to one another.", readings:[] },
 { id:'exhaust', name:"Core nozzle and tail plug", role:"The final passage for the core stream. The remaining pressure is converted into exhaust velocity here, and the tail plug shapes the annulus so the gas leaves cleanly along the axis.", readings:[] },
 ],
};
