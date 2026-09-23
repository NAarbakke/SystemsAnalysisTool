import { callout } from './shared.js';
/** @param {{ defs?: string, background?: string, flow?: string, parts: import('./shared.js').Part[] }} model */
export function renderDiagram(model) {
 return (model.defs || '') + (model.background || '') + model.parts.map(part=>part.svg).join('') +
  '<g class="airflow" aria-hidden="true">'+(model.flow || '')+'</g>' + model.parts.map(callout).join('');
}
