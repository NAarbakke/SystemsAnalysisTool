import { renderDiagram } from '../../models/engine-diagrams/views.js';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '../theme.ts';
import './style.css';
import turbofan from '../../models/engine-diagrams/turbofan/model.js';
import solid from '../../models/engine-diagrams/solid-rocket/model.js';
import liquid from '../../models/engine-diagrams/liquid-rocket/model.js';
import { createCutaway } from './cutaway.ts';

const models = { turbofan, solid, liquid };
const $ = id => document.getElementById(id);
const svg = $('engine-svg'), scene = $('engine-scene');
let model, selected, scale = 1, offset = { x:0, y:0 }, drag;
let cutaway;
try {
 cutaway=createCutaway($('engine-3d'),id=>select(id),percent=>{
  $('zoom-level').value=`${percent}%`;
  $('zoom-out').disabled=percent<=33;$('zoom-in').disabled=percent>=357;
 });
 $('engine-3d').hidden=false;svg.hidden=true;
 document.querySelector('.drawing-help').textContent='Drag to orbit · Scroll to zoom · Select a component';
} catch(error) {
 console.error('3D cutaway could not start',error);
 document.querySelector('.drawing-help').textContent='3D unavailable in this browser · Showing illustrated section';
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
$('flow-toggle').checked = !reducedMotion.matches;
function updateFlow() {
 svg.classList.toggle('flow-visible', $('flow-toggle').checked && !!model?.flow);
 svg.classList.toggle('flow-running', $('flow-toggle').checked && !document.hidden && document.body.dataset.visible !== 'false');
}
function renderView() {
 scene.setAttribute('transform', `translate(${offset.x} ${offset.y}) scale(${scale})`);
 $('zoom-level').value = `${Math.round(scale*100)}%`;
 $('zoom-out').disabled = scale <= .35; $('zoom-in').disabled = scale >= 4;
}
function fitView(){
 if(cutaway){cutaway.fit();return;}
 // All authored diagrams share this viewBox; panels occupy separate layout space.
 scale=1;offset={x:0,y:0};
 renderView();
}
function point(event) {
 return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
}
function zoom(factor, anchor = {x:600,y:280}) {
 if(cutaway){cutaway.zoom(factor);return;}
 const next = Math.min(4, Math.max(.35, scale * factor));
 offset = {x:anchor.x - (anchor.x-offset.x)*next/scale, y:anchor.y - (anchor.y-offset.y)*next/scale};
 scale=next; renderView();
}
function select(id) {
 selected = id === selected ? undefined : id;
 cutaway?.select(selected);
 document.querySelectorAll('[data-label]').forEach(el => el.classList.toggle('active', el.dataset.label === selected));
 const part = model.parts.find(part => part.id === selected);
 document.querySelectorAll('[data-part]').forEach(el => {
  el.classList.toggle('selected', el.dataset.part === selected);
  el.setAttribute('aria-pressed', String(el.dataset.part === selected));
 });
 $('selected-name').textContent = part?.name || 'Overview';
 $('selected-role').textContent = part?.role || model.description || 'Select a component to explore this conceptual section.';
 $('selection-index').textContent = part ? String(model.parts.indexOf(part)+1).padStart(2,'0') : '—';
 const readings = part ? part.readings : [];
 $('readings').hidden = readings.length === 0;
 $('readings').replaceChildren(...readings.map(([label,value,unit]) => {
  const card=document.createElement('div'); card.className='reading';
  const title=document.createElement('span'); title.textContent=label;
  const number=document.createElement('strong'); number.textContent=value;
  const suffix=document.createElement('small'); suffix.textContent=unit;
  number.append(suffix); card.append(title,number); return card;
 }));
}
function loadModel(id) {
 model=models[id] || turbofan; selected=undefined;
 $('diagram-badge').textContent=model.badge;
 $('data-note').textContent=model.note;
 $('reference-link').hidden = !model.reference;
 if(model.reference) $('reference-link').href = model.reference;
 svg.setAttribute('aria-label', `${model.name} selectable schematic`);
 if(cutaway)cutaway.load(model.id);else scene.innerHTML=renderDiagram(model);
 $('flow-toggle').closest('label').hidden = !!cutaway || !model.flow;
 $('component-buttons').replaceChildren(...model.parts.map((part,index)=>{
  const button=document.createElement('button'); button.dataset.part=part.id;
  const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
  const name=document.createElement('span');name.textContent=part.name;
  button.append(number,name);
  button.addEventListener('click',()=>select(part.id)); return button;
 }));
 select(undefined); fitView();updateFlow();
}
$('engine-model').addEventListener('change',event=>loadModel(event.target.value));
$('zoom-in').addEventListener('click',()=>zoom(1.25));
$('zoom-out').addEventListener('click',()=>zoom(.8));
$('fit').addEventListener('click',fitView);
$('flow-toggle').addEventListener('change',updateFlow);
svg.addEventListener('wheel',event=>{event.preventDefault();zoom(Math.exp(-event.deltaY*.001),point(event));},{passive:false});
svg.addEventListener('pointerdown',event=>{
 if(event.button!==0 || drag)return;
 const target = event.target.closest('[data-part],[data-label]');
 drag={id:event.pointerId,start:point(event),clientX:event.clientX,clientY:event.clientY,offset:{...offset},part:target?.dataset.part || target?.dataset.label,moved:false};
 svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove',event=>{
 if(!drag || drag.id!==event.pointerId)return;
 drag.moved ||= Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)>5;
 if(!drag.moved)return;
 const cursor=point(event);offset={x:drag.offset.x+cursor.x-drag.start.x,y:drag.offset.y+cursor.y-drag.start.y};renderView();
});
svg.addEventListener('pointerup',event=>{
 if(!drag || drag.id!==event.pointerId)return;
 if(!drag.moved)select(drag.part);
 drag=undefined;svg.releasePointerCapture(event.pointerId);
});
svg.addEventListener('pointercancel',()=>{drag=undefined;});
svg.addEventListener('lostpointercapture',()=>{drag=undefined;});
svg.addEventListener('keydown',event=>{
 const part=event.target.closest('[data-part]');
 if(part && (event.key==='Enter'||event.key===' ')){event.preventDefault();select(part.dataset.part);}
 if(event.key==='Escape'){selected=undefined;select(undefined);}
});
document.addEventListener('visibilitychange',updateFlow);
window.addEventListener('message',event=>{
 if(event.origin!==location.origin || event.source!==parent || event.data?.type!=='engine-visibility')return;
 document.body.dataset.visible=String(event.data.visible===true);updateFlow();
});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)$('flow-toggle').checked=false;updateFlow();});
loadModel('turbofan');
