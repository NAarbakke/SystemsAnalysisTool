import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDiagram } from '../models/engine-diagrams/views.js';
import turbofan from '../models/engine-diagrams/turbofan/model.js';
import solid from '../models/engine-diagrams/solid-rocket/model.js';
import liquid from '../models/engine-diagrams/liquid-rocket/model.js';
for(const model of [solid,liquid])test(model.id+': drawing preserves selectable component identities',()=>{
 const svg=renderDiagram(model);
 assert.deepEqual([...svg.matchAll(/data-part="([^"]+)"/g)].map(m=>m[1]),model.parts.map(p=>p.id));
 assert.equal([...svg.matchAll(/tabindex="0"/g)].length,model.parts.length);
 assert.doesNotMatch(svg,/undefined|NaN|Infinity/);
});
import turbojet from '../models/engine-diagrams/turbojet/model.js';
for(const model of [turbojet,turbofan])test(model.id+': authored drawing carries every described component',()=>{
 const ids=[...new Set([...model.svg.matchAll(/data-part="([^"]+)"/g)].map(m=>m[1]))];
 assert.deepEqual(ids.slice().sort(),model.parts.map(p=>p.id).sort());
 assert.ok(model.parts.every(p=>p.role&&Array.isArray(p.readings)));
 assert.ok(model.svg.startsWith('<g id="'+model.id+'-tp"')&&model.svg.endsWith('</g>'));
 assert.doesNotMatch(model.svg,/undefined|NaN|<script/);
});
