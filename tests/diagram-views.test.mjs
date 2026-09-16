import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDiagram } from '../models/engine-diagrams/views.js';
import turbofan from '../models/engine-diagrams/turbofan/model.js';
import solid from '../models/engine-diagrams/solid-rocket/model.js';
import liquid from '../models/engine-diagrams/liquid-rocket/model.js';
for(const model of [turbofan,solid,liquid])test(model.id+': drawing preserves selectable component identities',()=>{
 const svg=renderDiagram(model);
 assert.deepEqual([...svg.matchAll(/data-part="([^"]+)"/g)].map(m=>m[1]),model.parts.map(p=>p.id));
 assert.equal([...svg.matchAll(/tabindex="0"/g)].length,model.parts.length);
 assert.doesNotMatch(svg,/undefined|NaN|Infinity/);
});
