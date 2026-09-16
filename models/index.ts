import { createSS27 } from './ss-27/model.ts';
import { createRocket } from './burevestnik/model.ts';
import { createSpindle } from './spindle/model.ts';
import { createIndustrialMotor } from './industrial-motor/model.ts';
import { createTurbofan } from './turbofan/model.ts';
import type { Assembly } from '../src/assembly.ts';

export interface ModelDefinition {
  id: string;
  title: string;
  description: string;
  view: [number, number, number];
  create: () => Assembly;
}

export const models: ModelDefinition[] = [
  { id: 'ss-27', title: 'SS-27 / Topol-M', description: 'Illustrative exterior', view: [4, 1.5, 9], create: createSS27 },
  { id: 'burevestnik', title: 'Burevestnik', description: 'Illustrative exterior', view: [-3, 4, 8], create: createRocket },
  { id: 'spindle', title: 'Precision spindle', description: 'Example assembly', view: [7, 4, 9], create: createSpindle },
];
// The civilian teaching motor belongs only to the assembly explorer.
export const assemblyModels: ModelDefinition[] = [...models, {
  id:'industrial-motor', title:'Industrial electric motor', description:'Illustrative sections · synthetic readings', view:[7,4,9], create:createIndustrialMotor,
}, {
  id:'turbofan', title:'Civilian turbofan', description:'Illustrative cutaway', view:[-7,4,9], create:createTurbofan,
}];
