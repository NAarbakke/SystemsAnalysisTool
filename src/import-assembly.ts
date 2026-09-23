import { Box3, BufferAttribute, BufferGeometry, Color, Group, LoadingManager, Matrix3, Mesh, MeshStandardMaterial, Texture, Vector3, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Assembly, AssemblyPart } from './assembly.ts';

export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
const IMPORTABLE = /\.(glb|stl|stp|step)$/i;

export function isImportable(name: string) { return IMPORTABLE.test(name); }

/** Reject unsupported/external resources before asking the loader to allocate geometry. */
export function inspectGLB(data: ArrayBuffer) {
  if (data.byteLength > MAX_IMPORT_BYTES) throw new Error('Use a GLB smaller than 100 MB. Reduce export tessellation or texture sizes.');
  if (data.byteLength < 20) throw new Error('This is not a valid GLB file.');
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== data.byteLength) throw new Error('Use a complete glTF 2.0 binary (.glb) file.');
  let json: any;
  for (let offset = 12; offset < data.byteLength;) {
    if (offset + 8 > data.byteLength) throw new Error('The GLB has a truncated chunk.');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > data.byteLength) throw new Error('The GLB has an invalid chunk length.');
    if (offset === 12 && type !== 0x4e4f534a) throw new Error('The GLB is missing its JSON header.');
    if (type === 0x4e4f534a) {
      if (json) throw new Error('The GLB contains duplicate JSON chunks.');
      try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, offset + 8, length))); }
      catch { throw new Error('The GLB metadata is not valid JSON.'); }
    }
    offset += 8 + length;
  }
  if (!json || json.asset?.version !== '2.0') throw new Error('Use glTF 2.0 format.');
  for (const item of [...(json.buffers || []), ...(json.images || [])]) {
    if (item.uri !== undefined && (typeof item.uri !== 'string' || !item.uri.startsWith('data:'))) throw new Error('This GLB references external files. Export a self-contained GLB with embedded textures and geometry.');
  }
  const unsupported = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu', 'EXT_mesh_gpu_instancing'];
  if ([...(json.extensionsUsed || []), ...(json.extensionsRequired || [])].some(extension => unsupported.includes(extension))) throw new Error('Export without Draco/Meshopt compression, KTX2 textures or GPU instancing. Use standard embedded PNG/JPEG textures.');
  if (json.skins?.length) throw new Error('Use a rigid assembly export without skinning.');
  if ((json.buffers || []).reduce((sum: number, buffer: any) => sum + (buffer.byteLength || 0), 0) > 256 * 1024 * 1024) throw new Error('The unpacked geometry is too large. Reduce export tessellation.');
  return json;
}

export function disposeImported(...roots: Object3D[]) {
  const geometries = new Set<Mesh['geometry']>(), materials = new Set<Material>(), textures = new Set<Texture>();
  roots.forEach(root => root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  }));
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  const images = new Set<{ close?: () => void }>(); // Bitmaps can be shared by multiple textures.
  for (const texture of textures) { if (texture.image) images.add(texture.image); texture.dispose(); }
  for (const image of images) (image as { close?: () => void }).close?.();
}

export function assemblyFromScene(content: Group): Assembly {
  const meshes: Mesh[] = [], unwanted: Object3D[] = [];
  let triangles = 0;
  content.traverse(object => {
    if ((object as any).isLight || (object as any).isCamera) unwanted.push(object);
    if (!(object instanceof Mesh)) return;
    if ((object as any).isSkinnedMesh || (object as any).isInstancedMesh) throw new Error('Use a rigid assembly with individual mesh components.');
    const positions = object.geometry.getAttribute('position');
    if (!positions?.count) return;
    triangles += (object.geometry.index?.count ?? positions.count) / 3;
    if (meshes.length >= 5000 || triangles > 2_000_000) throw new Error('This assembly exceeds 5,000 mesh parts or 2 million triangles. Reduce export detail or split the assembly.');
    meshes.push(object);
  });
  unwanted.forEach(object => object.removeFromParent());
  if (!meshes.length) throw new Error('No mesh geometry was found in the GLB.');
  content.updateMatrixWorld(true);
  const sourceBounds = new Box3().setFromObject(content);
  const size = sourceBounds.getSize(new Vector3()), center = sourceBounds.getCenter(new Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(span) || span <= 0 || !center.toArray().every(Number.isFinite)) throw new Error('The imported assembly has invalid or empty bounds.');
  const worldOffsets = new Map<Mesh, Vector3>();
  for (const [index, mesh] of meshes.entries()) {
    mesh.geometry.computeBoundingBox();
    const partCenter = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).getCenter(new Vector3());
    const direction = partCenter.sub(center);
    if (direction.length() < span * .001) {
      const angle = index * 2.399963;
      direction.set(Math.cos(angle), (index % 3 - 1) * .5, Math.sin(angle));
    }
    worldOffsets.set(mesh, direction.normalize().multiplyScalar(meshes.length > 1 ? span * .4 : 0));
    mesh.name ||= `Mesh ${index + 1}`;
  }
  const parts: AssemblyPart[] = meshes.map(mesh => {
    let ancestor = mesh.parent;
    while (ancestor && !worldOffsets.has(ancestor as Mesh)) ancestor = ancestor.parent;
    const relativeOffset = worldOffsets.get(mesh)!.clone();
    if (ancestor) relativeOffset.sub(worldOffsets.get(ancestor as Mesh)!);
    const basis = new Matrix3().setFromMatrix4(mesh.parent!.matrixWorld);
    if (Math.abs(basis.determinant()) < 1e-15) throw new Error('A component has a zero-scale transform. Repair the export first.');
    return { mesh, home: mesh.position.clone(), offset: relativeOffset.applyMatrix3(basis.invert()) };
  });
  // Normalize only the display wrapper; original geometry and component hierarchy stay intact.
  const root = new Group(), normalized = new Group();
  const scale = 8 / span;
  normalized.scale.setScalar(scale); normalized.position.copy(center).multiplyScalar(-scale);
  normalized.add(content); root.add(normalized);
  const setExplosion = (amount: number) => {
    const t = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
    parts.forEach(part => part.mesh.position.copy(part.home).addScaledVector(part.offset, t));
    root.updateMatrixWorld(true);
  };
  const bounds = new Box3();
  for (const amount of [0, 1]) { setExplosion(amount); bounds.union(new Box3().setFromObject(root)); }
  setExplosion(0);
  return { root, parts, bounds, setExplosion, dispose: () => disposeImported(root) };
}

/** STEP solids keep their own colours; STL carries a single untinted shell. */
function meshMaterial(color?: number[]) {
  return new MeshStandardMaterial({ color: color ? new Color(color[0], color[1], color[2]) : 0x93a0ac, metalness: .25, roughness: .55 });
}

/** STL and STEP arrive as tessellated geometry, without glTF's scene graph, materials or animations. */
export async function loadTessellatedAssembly(data: ArrayBuffer, name: string) {
  if (data.byteLength > MAX_IMPORT_BYTES) throw new Error(`Use a file smaller than ${MAX_IMPORT_BYTES / 1024 / 1024} MB. Reduce export tessellation.`);
  const content = new Group();
  if (/\.stl$/i.test(name)) {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    let geometry: BufferGeometry;
    try { geometry = new STLLoader().parse(data); }
    catch { throw new Error('This STL could not be read. Export it again as binary or ASCII STL.'); }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, meshMaterial());
    mesh.name = name.replace(/\.stl$/i, '') || 'Imported shell';
    content.add(mesh);
  } else {
    // The CAD kernel is a 7 MB wasm module, so it loads only when a STEP file is opened.
    const [{ default: startKernel }, { default: kernelWasm }] = await Promise.all([
      import('occt-import-js'), import('occt-import-js/dist/occt-import-js.wasm?url'),
    ]);
    const kernel = await startKernel({ locateFile: () => kernelWasm });
    const result = kernel.ReadStepFile(new Uint8Array(data), null);
    if (!result?.success || !result.meshes?.length) throw new Error('No solid geometry was found in this STEP file. Export solids rather than sketches or surfaces.');
    for (const [index, solid] of result.meshes.entries()) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(Float32Array.from(solid.attributes.position.array), 3));
      if (solid.attributes.normal?.array?.length) geometry.setAttribute('normal', new BufferAttribute(Float32Array.from(solid.attributes.normal.array), 3));
      if (solid.index?.array?.length) geometry.setIndex(new BufferAttribute(Uint32Array.from(solid.index.array), 1));
      if (!solid.attributes.normal?.array?.length) geometry.computeVertexNormals();
      const mesh = new Mesh(geometry, meshMaterial(solid.color));
      mesh.name = solid.name || `Solid ${index + 1}`;
      content.add(mesh);
    }
  }
  try { return { assembly: assemblyFromScene(content), animationsIgnored: false }; }
  catch (error) { disposeImported(content); throw error; }
}

export function loadImportedFile(data: ArrayBuffer, name: string) {
  if (!isImportable(name)) throw new Error('Choose a .glb, .stl, .stp or .step file.');
  return /\.glb$/i.test(name) ? loadImportedAssembly(data) : loadTessellatedAssembly(data, name);
}

export async function loadImportedAssembly(data: ArrayBuffer) {
  const metadata = inspectGLB(data);
  const manager = new LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw new Error('External resources are not loaded. Export a self-contained GLB.');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(data, '');
  try {
    const assembly = assemblyFromScene(gltf.scene);
    assembly.dispose = () => disposeImported(...gltf.scenes);
    return { assembly, animationsIgnored: Boolean(metadata.animations?.length) };
  } catch (error) { disposeImported(...gltf.scenes); throw error; }
}
