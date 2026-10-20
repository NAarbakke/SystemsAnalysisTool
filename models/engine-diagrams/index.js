import turbojet from './turbojet/model.js';
import turbofan from './turbofan/model.js';
import solid from './solid-rocket/model.js';
import liquid from './liquid-rocket/model.js';

/**
 * @typedef {{ id: string, name: string, badge: string, note: string, description?: string, reference?: string,
 *   svg?: string, flow?: string, background?: string, defs?: string, parts: import('./shared.js').Part[] }} EngineModel
 */

/** The Engines Model menu, in order; the first opens by default. @type {{ label: string, model: EngineModel }[]} */
export const engines = [
 { label: 'Turbojet', model: turbojet },
 { label: 'Civilian turbofan', model: turbofan },
 { label: 'Solid rocket · schematic', model: solid },
 { label: 'Liquid rocket · schematic', model: liquid },
];
