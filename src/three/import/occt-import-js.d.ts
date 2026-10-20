/** Minimal surface of the OpenCascade wasm build used for STEP import. */
declare module 'occt-import-js' {
  export interface OcctArray { array: ArrayLike<number> }
  export interface OcctMesh {
    name?: string;
    color?: number[];
    attributes: { position: OcctArray; normal?: OcctArray };
    index?: OcctArray;
  }
  /** A product of the STEP assembly tree: its own solids by index into `meshes`, and its sub-products. */
  export interface OcctNode { name?: string; meshes: number[]; children: OcctNode[] }
  export interface OcctResult { success: boolean; meshes: OcctMesh[]; root: OcctNode }
  export interface Occt {
    ReadStepFile(data: Uint8Array, parameters: unknown): OcctResult;
  }
  export default function startKernel(options?: { locateFile?: (name: string) => string }): Promise<Occt>;
}
