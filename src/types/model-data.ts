import { GlMatrix } from "../core/gl-matrix";
import { Buffers, GltfArray } from "./gltf";

export interface GltfPrimitiveData {
  attributes: Buffers;
  indices?: GltfArray;
  vertexCount: number;
}

export interface ModelWebGlBuffer {
  position: WebGLBuffer | null;
  color: WebGLBuffer | null;
  normal: WebGLBuffer | null;
  index: WebGLBuffer | null;
  vertexCount: number;
}

export interface ModelWebGlBuffers {
  [key: string]: ModelWebGlBuffer;
}

export interface ModelRenderOptions {
  viewMatrix: GlMatrix;
  [key: string]: any;
}
