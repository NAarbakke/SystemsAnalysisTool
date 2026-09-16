import { callout } from './shared.js';
export function renderDiagram(model) {
 return (model.defs || '') + model.background + model.parts.map(part=>part.svg).join('') +
  '<g class="airflow" aria-hidden="true">'+model.flow+'</g>' + model.parts.map(callout).join('');
}
