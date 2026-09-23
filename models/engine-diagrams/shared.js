/** @typedef {[label: string, value: string, unit: string]} Reading */
/** @typedef {{ id: string, name: string, role: string, readings: Reading[], label?: number[], svg?: string }} Part */

/**
 * @param {string} id @param {string} name @param {string} role @param {string} geometry
 * @param {number[]} [label] callout position: anchor x, y and leader tip x, y
 * @param {Reading[]} [readings]
 * @returns {Part}
 */
export function component(id, name, role, geometry, label, readings = []) {
 return { id, name, role, readings, label, svg: `<g class="engine-part" data-part="${id}" role="button" tabindex="0" aria-label="${name}" aria-pressed="false"><title>${name}</title>${geometry}</g>` };
}
/** @param {Part} part @param {number} index */
export function callout(part, index) {
 if (!part.label) return '';
 const [x,y,tx,ty] = part.label;
 const elbow = y < 280 ? y + 24 : y - 24;
 return `<g class="annotation" data-label="${part.id}" aria-hidden="true"><path d="M${tx} ${ty}L${x} ${elbow}V${y}"/><circle class="anchor" cx="${tx}" cy="${ty}" r="2.5"/><circle class="callout-disc" cx="${x}" cy="${y}" r="13"/><text class="callout-number" x="${x}" y="${y+4}">${String(index+1).padStart(2,'0')}</text><text class="callout-name" x="${x}" y="${y < 280 ? y-23 : y+31}">${part.name}</text></g>`;
}
/** @param {number[]} xs @param {number} top @param {number} bottom */
export function seams(xs, top, bottom) {
 return xs.map(x=>`<path class="surface-line" d="M${x} ${top}V${top+17} M${x} ${bottom-17}V${bottom}"/>`).join('');
}

