import { machinedRing, tube, detailMesh, box, band, bolt, bearingDetails, disposeParts, type Detail } from '../display-details.ts';
import { Box3, CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2, Vector3, type BufferGeometry } from 'three';
import type { Assembly, AssemblyPart } from '../../src/assembly.ts';
import type { ComponentReading } from '../../src/component-data.ts';

/** Civilian teaching model. Shapes, material assignments and readings are illustrative. */
export function createIndustrialMotor(): Assembly {
  const root = new Group(); root.name = 'Industrial electric motor';
  const parts: AssemblyPart[] = [];
  const ring = machinedRing;
  const reading = (label: string, value: number, unit: string): ComponentReading => ({label,value,unit});
  function add(name: string, geometry: BufferGeometry, color: string, y: number, offset: [number,number,number], materialName: string, role: string, description: string, readings: ComponentReading[]) {
    const material = new MeshStandardMaterial({color,metalness:.45,roughness:.35}); material.name = `${name} finish`;
    const mesh = new Mesh(geometry,material); mesh.name = name; mesh.position.y = y;
    mesh.userData.description = description;
    mesh.userData.partId = name.toLowerCase().replaceAll(' ','-');
    mesh.userData.componentInfo = {partNumber:`DEMO-${String(parts.length+1).padStart(3,'0')}`,material:materialName,role,source:'Illustrative assignments'};
    mesh.userData.operatingDataSource = 'Synthetic snapshot · not measured';
    mesh.userData.operatingStages = [{id:'snapshot',label:'Example snapshot',readings}];
    root.add(mesh); parts.push({mesh,home:mesh.position.clone(),offset:new Vector3(...offset)});
  }
  add('Housing',ring(1.25,1.1,2.3),'#426276',0,[2.8,0,0],'Cast aluminium','Stationary enclosure',
    'The outer enclosure supports the stationary motor structure and provides a surface for heat transfer. Cooling fins, feet and a terminal box are represented as display detail.',
    [reading('Surface temperature',43,'°C'),reading('Vibration RMS',.7,'mm/s')]);
  add('Stator',ring(1.08,.82,1.9),'#ac7845',0,[-2.6,0,0],'Electrical steel and copper windings','Stationary electromagnetic section',
    'The stationary winding and core surround the rotor. The simplified copper-colored ring represents the winding/core section, with decorative end-winding blocks.',
    [reading('Winding temperature',68,'°C'),reading('Phase current RMS',4.8,'A'),reading('Electrical frequency',50,'Hz')]);
  add('Rotor',new CylinderGeometry(.76,.76,1.75,64),'#87969e',0,[0,0,2.5],'Electrical steel and aluminium conductors','Rotating electromagnetic section',
    'The rotating section sits inside the stator and transfers rotation to the shaft. Surface bars are decorative; no electromagnetic geometry is specified.',
    [reading('Speed',1450,'rpm'),reading('Rotor temperature',61,'°C')]);
  add('Output shaft',new CylinderGeometry(.23,.23,3.65,48),'#c0c9cf',0,[0,.2,-2.5],'Steel','Rotating mechanical output',
    'The shaft carries rotation from the rotor to the external load. A display key and retaining bands are shown.',
    [reading('Speed',1450,'rpm'),reading('Torque',12,'N·m'),reading('Mechanical power',1.822,'kW'),reading('Surface temperature',39,'°C')]);
  for (const [name,y,dy,temp] of [['Drive-end bearing',-1.3,-1.8,47],['Non-drive-end bearing',1.3,1.8,44]] as const) {
    add(name,ring(.52,.24,.24),'#d2b374',y,[0,dy,0],'Bearing steel','Shaft support',
      'Supports the rotating shaft relative to the end cover. Pressure refers to an illustrative external oil-lubrication circuit, not the solid bearing material. Rolling elements are shown illustratively.',
      [reading('Inner-ring speed',1450,'rpm'),reading('Outer-ring temperature',temp,'°C'),reading('Oil supply pressure',2.1,'bar(g)'),reading('Oil supply temperature',35,'°C')]);
  }
  add('Drive-end cover',ring(1.25,.53,.2),'#426276',-1.55,[0,-2.7,0],'Cast aluminium','Stationary bearing support',
    'Closes the drive end of the housing and locates the bearing. The shaft passes through the central opening.',[reading('Surface temperature',40,'°C')]);
  add('Non-drive-end cover',ring(1.25,.53,.2),'#426276',1.55,[0,2.7,0],'Cast aluminium','Stationary bearing support',
    'Closes the opposite end of the housing and supports the second bearing. Decorative cover fasteners are shown.',[reading('Surface temperature',38,'°C')]);

  for(const {mesh} of parts){
    const d:Detail[]=[];
    if(mesh.name==='Housing'){
      for(const x of [-.24,.24])for(const y of [-.19,.19])d.push({geometry:new CylinderGeometry(.035,.035,.025,6).rotateX(Math.PI/2).translate(x,y,1.535),color:'#b9c7cd'});
      d.push({geometry:new CylinderGeometry(.11,.11,.23,16).rotateZ(Math.PI/2).translate(.43,0,1.34),color:'#263a46'});
      for(let i=0;i<24;i++)d.push({geometry:box(.16,2.13,.035,1.28,0,0).rotateY(i*Math.PI/12),color:'#52768a'});
      for(const y of [-.75,.75])for(const x of [-.8,.8])d.push({geometry:box(.55,.36,.22,x,y,-1.15),color:'#426276'});
      d.push({geometry:box(.7,.6,.32,0,0,1.32),color:'#355568'},{geometry:box(.62,.52,.04,0,0,1.5),color:'#597c8e'});
      for(const y of [-1.08,1.08])d.push({geometry:band(1.26,.035,y),color:'#69828e'});
    }
    if(mesh.name==='Stator'){
      for(const end of [-1,1])for(let i=0;i<18;i++){
        const a=i*Math.PI/9,points:[number,number,number][]=[];
        for(let j=0;j<=8;j++){const t=j/8,theta=a+(t-.5)*.22;points.push([.94*Math.cos(theta),end*(.92+.22*Math.sin(t*Math.PI)),.94*Math.sin(theta)]);}
        d.push({geometry:tube(points,.037,12),color:'#c88b50'});
      }
      for(let i=0;i<20;i++)d.push({geometry:band(1.082,.006,-.86+i*.09),color:'#59656c'});
      for(const y of [-.98,.98])for(let i=0;i<18;i++){const a=i*Math.PI/9;d.push({geometry:box(.17,.24,.14,.95,y,0).rotateY(a),color:'#d39855'});}
      for(let i=0;i<24;i++)d.push({geometry:box(.045,1.8,.06,.825,0,0).rotateY(i*Math.PI/12),color:'#506068'});
    }
    if(mesh.name==='Rotor'){
      for(let i=0;i<28;i++)d.push({geometry:band(.762,.004,-.8+i*.06),color:'#a1aeb4'});
      for(let i=0;i<24;i++)d.push({geometry:box(.025,1.63,.04,.758,0,0).rotateY(i*Math.PI/12),color:'#556974'});
      for(const y of [-.86,.86])d.push({geometry:band(.68,.038,y),color:'#b3bfc4'});
    }
    if(mesh.name==='Output shaft'){d.push({geometry:box(.09,.56,.045,0,-1.45,.229),color:'#81939e'});for(const y of [-1.15,1.15])d.push({geometry:band(.235,.018,y),color:'#62747e'});}
    if(mesh.name.includes('bearing')){mesh.geometry.dispose();mesh.geometry=ring(.52,.45,.24);d.push({geometry:ring(.31,.24,.24),color:'#a8bac4'},...bearingDetails(.38),{geometry:band(.5,.026,.13),color:'#97a6b0'});}
    if(mesh.name.includes('cover')){
      for(let i=0;i<8;i++){d.push({geometry:bolt(1.05,.14,i*Math.PI/4),color:'#b4c2ca'});d.push({geometry:box(.46,.07,.06,.78,.14,0).rotateY(i*Math.PI/4),color:'#52768a'});}
      d.push({geometry:band(1.18,.02,.12),color:'#8aa0ac'});
    }
    detailMesh(mesh,d);
  }

  function setExplosion(amount: number) {
    const t = Number.isFinite(amount) ? Math.max(0,Math.min(1,amount)) : 0;
    parts.forEach(p=>p.mesh.position.copy(p.home).addScaledVector(p.offset,t)); root.updateMatrixWorld(true);
  }
  const bounds = new Box3(); for (const t of [0,1]) { setExplosion(t); bounds.union(new Box3().setFromObject(root)); } setExplosion(0);
  return {root,parts,bounds,setExplosion,dispose() {disposeParts(parts);root.clear();}};
}
