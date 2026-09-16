import {
  ACESFilmicToneMapping, Box3, CylinderGeometry, DirectionalLight, DoubleSide,
  Group, HemisphereLight, LatheGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Raycaster, Scene, ShadowMaterial, Shape, ShapeGeometry,
  SRGBColorSpace, TorusGeometry, Vector2, Vector3, WebGLRenderer, PCFSoftShadowMap,
  TubeGeometry, CatmullRomCurve3, type BufferGeometry,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTurbofan } from '../../models/turbofan/model.ts';

// All dimensions below are artistic scene units, with no engineering scale.
const start = Math.PI * .2, arc = Math.PI * 1.25;
const finishes = { silver:0xaab4bc, steel:0x677782, warm:0x948571, liner:0x8e8677 };
function lathe(profile: number[][], cut = true) {
  return new LatheGeometry(profile.map(([x,r])=>new Vector2(r,x)),96,start,cut?arc:Math.PI*2).rotateZ(-Math.PI/2);
}
function surface(color: number, roughness = .3, metalness = .75) {
  return new MeshStandardMaterial({color,roughness,metalness,side:DoubleSide});
}
function sectionCaps(root: Group, profile: number[][], id: string) {
  const shape=new Shape(); profile.forEach(([x,r],i)=>i?shape.lineTo(x,r):shape.moveTo(x,r)); shape.closePath();
  for(const angle of [start,start+arc]) {
    const cap=new Mesh(new ShapeGeometry(shape).rotateX(angle+Math.PI/2),surface(0xc4b99d,.55,.4));
    cap.userData.diagramPart=id;root.add(cap);
  }
}
function add(root: Group,id: string,geometry: BufferGeometry,color=finishes.silver) {
  const mesh=new Mesh(geometry,surface(color));mesh.userData.diagramPart=id;root.add(mesh);return mesh;
}
function ring(root: Group,id: string,x: number,r: number,width: number,color=finishes.steel,cut=true) {
  add(root,id,lathe([[x-width/2,r-.06],[x-width/2,r],[x+width/2,r],[x+width/2,r-.06],[x-width/2,r-.06]],cut),color);
}
function cylinder(radius: number,length: number,x: number) {
  return new CylinderGeometry(radius,radius,length,48).rotateZ(Math.PI/2).translate(x,0,0);
}

function civilianTurbofan() {
  const assembly=createTurbofan(),root=assembly.root;
  const groups: Record<string,string>={'Inlet lip':'casing','Nacelle cutaway':'casing','Bypass outlet':'casing',Fan:'fan',Spinner:'fan','Core casing cutaway':'core-case','Compressor section':'compressor','Combustor section':'chamber','Turbine section':'turbine','Core exhaust':'exhaust'};
  for(const {mesh} of assembly.parts) {
    mesh.userData.diagramPart=groups[mesh.name];
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {
      const m=material as MeshStandardMaterial;
      m.color.set(mesh.name==='Combustor section'?0x857157:mesh.name==='Fan'?0x5c6b76:mesh.name==='Spinner'?0x65747d:mesh.name==='Nacelle cutaway'?0x8a949c:mesh.name==='Turbine section'?0x776e60:0x89969f);
      m.metalness=.78;m.roughness=mesh.name==='Nacelle cutaway'?.38:.34;
    }
  }
  sectionCaps(root,[[-2,1.7],[-1.6,1.73],[.8,1.67],[2,1.3],[2,1.22],[.8,1.57],[-1.6,1.63],[-2,1.6]],'casing');
  sectionCaps(root,[[-1.35,.8],[.4,.78],[1.25,.64],[1.25,.56],[.4,.7],[-1.35,.72]],'core-case');
  add(root,'shaft',cylinder(.07,3.6,-.05),0xbac5cb);
  add(root,'shaft',lathe([[-1.1,.13],[.7,.13],[.7,.09],[-1.1,.09],[-1.1,.13]],false),0x697a87);
  for(const x of [-1.35,1.2]) {
    ring(root,'bearings',x,.22,.16,0xa1acb5,false);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      const ball=new Mesh(new TorusGeometry(.035,.017,8,16).rotateY(Math.PI/2),surface(0xc1cbd1,.22));
      ball.position.set(x,.165*Math.cos(a),.165*Math.sin(a));ball.userData.diagramPart='bearings';root.add(ball);
    }
  }
  root.scale.x=1.5;
  return root;
}

function solidConcept() {
  const root=new Group();
  const casing=[[-2.8,.01],[-2.78,.7],[-2.55,1.05],[1.45,1.05],[1.7,.7],[1.58,.64],[1.35,.95],[-2.48,.95],[-2.66,.65],[-2.67,.01]];
  add(root,'case',lathe(casing),finishes.silver);sectionCaps(root,casing,'case');
  const fill=[[-2.47,.4],[-2.47,.89],[1.3,.89],[1.3,.4],[-2.47,.4]];
  const propellant=add(root,'propellant',lathe(fill),finishes.liner);(propellant.material as MeshStandardMaterial).metalness=.05;(propellant.material as MeshStandardMaterial).roughness=.85;
  sectionCaps(root,fill,'propellant');
  const chamber=add(root,'chamber',cylinder(.38,3.7,-.58),0x667c85);
  (chamber.material as MeshStandardMaterial).transparent=true;(chamber.material as MeshStandardMaterial).opacity=.08;(chamber.material as MeshStandardMaterial).depthWrite=false;
  const outlet=[[1.5,.7],[1.8,.43],[2,.28],[2.2,.35],[2.7,.7],[3.35,1.1],[3.35,1.02],[2.7,.62],[2.2,.27],[2,.2],[1.8,.35],[1.5,.62]];
  add(root,'nozzle',lathe(outlet),finishes.steel);sectionCaps(root,outlet,'nozzle');
  for(const x of [-2.25,1.25]) ring(root,'case',x,1.085,.07);
  return root;
}

function liquidConcept() {
  const root=new Group();
  for(const [id,y,color] of [['fuel',.95,0xa1967b],['oxidizer',-.95,0x83969f]] as const) {
    const profile=[[-3.4,0],[-3.37,.22],[-3.2,.46],[-2.9,.55],[-2.2,.55],[-1.9,.46],[-1.73,.22],[-1.7,0],[-1.8,0],[-1.86,.18],[-2,.38],[-2.2,.47],[-2.9,.47],[-3.12,.38],[-3.25,.18],[-3.3,0]];
    const tank=new Group();tank.position.y=y;root.add(tank);
    add(tank,id,lathe(profile),finishes.silver);sectionCaps(tank,profile,id);
    const volume=add(tank,id,cylinder(.42,1.1,-2.55),color);(volume.material as MeshStandardMaterial).metalness=.15;
    for(const segment of [[[-1.73,y,0],[-1.3,y,0],[-1.15,y*.5,0]],[[-.83,y*.5,0],[-.65,y*.5,0],[-.55,y*.42,0]]]) {
      add(root,'feed',new TubeGeometry(new CatmullRomCurve3(segment.map(p=>new Vector3(...p))),24,.045,10,false),finishes.silver);
    }
  }
  const chamber=[[-.55,.02],[-.55,.55],[-.4,.7],[.5,.7],[.8,.48],[.85,.33],[.74,.3],[.69,.43],[.45,.6],[-.35,.6],[-.45,.49],[-.45,.02]];
  add(root,'chamber',lathe(chamber),finishes.warm);sectionCaps(root,chamber,'chamber');
  const nozzle=[[.8,.35],[1,.28],[1.2,.35],[1.6,.6],[2.2,.93],[3,1.32],[3,1.24],[2.2,.85],[1.6,.52],[1.2,.27],[1,.2],[.8,.27]];
  add(root,'nozzle',lathe(nozzle),finishes.steel);sectionCaps(root,nozzle,'nozzle');
  return root;
}

export function createCutaway(host: HTMLElement,onSelect: (id?: string)=>void,onZoom: (percent: number)=>void) {
  const scene=new Scene(),camera=new PerspectiveCamera(34,1,.05,200);
  const renderer=new WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D cutaway: drag to orbit, scroll to zoom. Select parts with the Components buttons.');
  const pmrem=new PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  scene.add(new HemisphereLight(0xf2f6ff,0x3c4652,.45));
  const key=new DirectionalLight(0xfff3df,1.8);key.position.set(-4,7,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.001;scene.add(key);
  const rim=new DirectionalLight(0xd6e8ff,1.2);rim.position.set(4,2,-5);scene.add(rim);
  const ground=new Mesh(new PlaneGeometry(40,40),new ShadowMaterial({opacity:.18}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=true;
  let root: Group | undefined,homeDistance=10;
  const direction=new Vector3(-4,2.5,9).normalize(),raycaster=new Raycaster();
  function draw(){if(host.clientWidth&&host.clientHeight&&!host.hidden){renderer.render(scene,camera);onZoom(Math.round(homeDistance/camera.position.distanceTo(controls.target)*100));}}
  function resize(){if(!host.clientWidth||!host.clientHeight)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);if(root)fit();else draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);
  function select(id?:string){root?.traverse(object=>{if(object instanceof Mesh){for(const m of Array.isArray(object.material)?object.material:[object.material])if(m instanceof MeshStandardMaterial){m.emissive.set(object.userData.diagramPart===id?0x47799b:0);m.emissiveIntensity=.3;}}});draw();}
  function fit(){
    if(!root)return;
    const bounds=new Box3().setFromObject(root),center=bounds.getCenter(new Vector3());
    const right=new Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right),tan=Math.tan(camera.fov*Math.PI/360);
    homeDistance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const p=new Vector3(x,y,z).sub(center);
      homeDistance=Math.max(homeDistance,p.dot(direction)+Math.max(Math.abs(p.dot(up))/tan,Math.abs(p.dot(right))/(tan*camera.aspect)));
    }
    homeDistance*=1.08;controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,homeDistance);controls.minDistance=homeDistance*.28;controls.maxDistance=homeDistance*3;controls.update();draw();
  }
  function release(){if(!root)return;const geometries=new Set<BufferGeometry>(),materials=new Set<MeshStandardMaterial>();root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.remove(root);root=undefined;}
  let down: {x:number;y:number}|undefined;
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0)down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const click=Math.hypot(e.clientX-down.x,e.clientY-down.y)<5;down=undefined;if(!click||!root)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObject(root,true)[0];onSelect(hit?.object.userData.diagramPart);});
  renderer.domElement.addEventListener('pointercancel',()=>{down=undefined;});
  return {
    load(id:string){release();root=id==='turbofan'?civilianTurbofan():id==='solid'?solidConcept():liquidConcept();root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(root);ground.position.y=new Box3().setFromObject(root).min.y-.07;resize();},
    select,fit,resize,
    zoom(factor:number){const offset=camera.position.clone().sub(controls.target).multiplyScalar(1/factor);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();draw();},
    dispose(){observer.disconnect();controls.dispose();release();environment.dispose();ground.geometry.dispose();(ground.material as ShadowMaterial).dispose();renderer.dispose();renderer.domElement.remove();},
  };
}
