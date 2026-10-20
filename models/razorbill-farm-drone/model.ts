import type { Mesh } from 'three';
import type { Assembly } from '../../src/three/assembly.ts';
import { finishes, type Finish } from '../../src/three/finishes.ts';

/** STEP carries no materials; these are display finishes by part number, not a material specification. */
const FINISHES: Record<string, Finish> = {
  1110: finishes.composite, 1210: finishes.composite, 1220: finishes.composite,
  1140: finishes.polymer, 1160: finishes.polymer, 1260: finishes.polymer,
  1270: finishes.polymer, 1281: finishes.polymer, 1282: finishes.polymer, 1290: finishes.polymer,
  1150: finishes.anodised, 1283: finishes.anodised,
};

/** The Razorbill farm drone, read from its SolidWorks STEP export with the browser CAD kernel. */
export async function createRazorbill(): Promise<Assembly> {
  const [{ loadTessellatedAssembly }, { default: url }] = await Promise.all([
    import('../../src/three/import/load.ts'), import('./2000_Razorbill_farm_drone.STEP?url'),
  ]);
  const response = await fetch(url);
  if (!response.ok) throw new Error('The Razorbill STEP file could not be loaded.');
  const { assembly } = await loadTessellatedAssembly(await response.arrayBuffer(), '2000_Razorbill_farm_drone.step');
  for (const { mesh } of assembly.parts) restyle(mesh);
  return assembly;
}

function restyle(mesh: Mesh) {
  const finish = FINISHES[mesh.userData.partId as string];
  if (!finish) return;
  for (const material of [mesh.material].flat()) material.dispose();
  mesh.material = finish();
}
