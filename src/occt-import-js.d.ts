/** Minimal surface of the OpenCascade wasm build used for STEP import. */
declare module 'occt-import-js' {
  interface OcctArray { array: ArrayLike<number> }
  interface OcctMesh {
    name?: string;
    color?: number[];
    attributes: { position: OcctArray; normal?: OcctArray };
    index?: OcctArray;
  }
  interface Occt {
    ReadStepFile(data: Uint8Array, parameters: unknown): { success: boolean; meshes: OcctMesh[] };
  }
  export default function startKernel(options?: { locateFile?: (name: string) => string }): Promise<Occt>;
}
