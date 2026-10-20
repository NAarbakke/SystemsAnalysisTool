import type { Assembly } from '../../src/three/assembly.ts';

export interface ModelDefinition {
  id: string;
  title: string;
  description: string;
  view: [number, number, number];
  /** Builds a fresh assembly the caller owns; each model's code loads only when first chosen. */
  create: () => Promise<Assembly>;
  /** Euler XYZ turn that brings the model's long axis to Cesium's vehicle frame (glTF +Z forward, +Y up). */
  flyoverRotation?: [number, number, number];
  /** Loads geometry with fetch and the wasm CAD kernel, so it runs only in the browser (tests skip it). */
  browserOnly?: boolean;
}

/** Vehicles, shown in both Assembly and Flyover. */
export const models: ModelDefinition[] = [
  { id: 'ss-27', title: 'SS-27 / Topol-M', description: 'Illustrative exterior', view: [4, 1.5, 9],
    create: async () => (await import('./ss-27/model.ts')).createSS27() },
  { id: 'burevestnik', title: 'Burevestnik', description: 'Illustrative exterior', view: [-3, 4, 8], flyoverRotation: [0, Math.PI / 2, 0],
    create: async () => (await import('./burevestnik/model.ts')).createRocket() },
  { id: 'spindle', title: 'Precision spindle', description: 'Example assembly', view: [7, 4, 9],
    create: async () => (await import('./spindle/model.ts')).createSpindle() },
];

/** Every model the Assembly view offers; the civilian teaching models belong only here. */
export const assemblyModels: ModelDefinition[] = [...models,
  { id: 'industrial-motor', title: 'Industrial electric motor', description: 'Illustrative sections · synthetic readings', view: [7, 4, 9],
    create: async () => (await import('./industrial-motor/model.ts')).createIndustrialMotor() },
  { id: 'turbofan', title: 'Civilian turbofan', description: 'Illustrative cutaway', view: [-7, 4, 9],
    create: async () => (await import('./turbofan/model.ts')).createTurbofan() },
  { id: 'razorbill', title: 'Razorbill farm drone', description: 'SolidWorks STEP assembly', view: [2.5, 6, 10], browserOnly: true,
    create: async () => (await import('../razorbill-farm-drone/model.ts')).createRazorbill() },
];
