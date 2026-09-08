import { createSS27 } from './ss-27/model.ts';
import { createRocket } from './burevestnik/model.ts';
import { createSpindle } from './spindle/model.ts';
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
