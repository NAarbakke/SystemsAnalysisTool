import drawing from './drawing.js';

export default {
 id:'turbojet', name:'Turbojet', badge:'Single-spool turbojet · section and gas-path chart',
 note:"The chart shows the qualitative shape of pressure and temperature along the gas path. Stage counts, proportions and curve shapes are illustrative; there are no operating values.",
 description:"A full section of a single-spool turbojet, with pressure and temperature traced along the same axial stations underneath. Select a component to highlight it.",
 svg:drawing, flow:'',
 parts:[
 { id:'inlet', name:"Inlet", role:"The cowl and intake duct that capture air and slow it before the compressor face. The front frame strut crosses the annulus to carry the forward bearing load into the casing.", readings:[] },
 { id:'nose-cone', name:"Nose cone", role:"The spinner that caps the front of the rotor assembly. It splits the incoming air smoothly onto the first blade row and keeps the hub line free of sharp edges.", readings:[] },
 { id:'compressor', name:"Axial compressor", role:"Alternating rotor and stator rows raise the pressure of the air stage by stage. Blades get shorter toward the rear as the annulus closes down to keep the axial velocity roughly steady while the density rises.", readings:[] },
 { id:'combustor', name:"Combustion chamber", role:"Fuel burns continuously inside the flame tube while the surrounding annulus feeds cooling and dilution air through the liner holes. Heat is added at nearly constant pressure, so the temperature climbs steeply here.", readings:[] },
 { id:'fuel-injectors', name:"Fuel injectors", role:"Injectors spray atomised fuel into the front of the flame tube, where it mixes with swirling primary air. They are fed from a manifold outside the casing.", readings:[] },
 { id:'igniter', name:"Igniter plug", role:"A high-energy plug reaching through the casing into the primary zone. It lights the mixture during starting and relight; once burning is established the flame is self-sustaining.", readings:[] },
 { id:'turbine', name:"Turbine", role:"Nozzle guide vanes turn and accelerate the hot gas onto each rotor row, which extracts the shaft work that drives the compressor. The annulus grows toward the rear as the gas expands and its density falls.", readings:[] },
 { id:'nozzle', name:"Propelling nozzle and tail cone", role:"The tail cone fairs the gas away from the turbine hub and the convergent nozzle accelerates it to produce thrust. Pressure and temperature both fall across this final expansion.", readings:[] },
 { id:'shaft', name:"Main shaft", role:"A single spool connecting the turbine to the compressor, so the two always run at the same speed. All the work the turbine extracts is delivered back along it.", readings:[] },
 { id:'bearings', name:"Main bearings", role:"Forward and rear bearings locate the spool radially and axially and pass its loads into the front frame and the exhaust struts. They sit inside the hub cavity, clear of the gas path.", readings:[] },
 { id:'casing', name:"Engine casing", role:"The pressure-carrying outer shell and the inner wall that together define the gas path. Bolted flanges split it into modules and carry the stator and vane rows.", readings:[] },
 ],
};
