import { GltfAsset, GltfLoader } from "gltf-loader-ts";
import { COMPONENTS_MAP, COMPONENT_TYPE_MAP } from "../tools/constants";
import {
  GltfPrimitiveData,
  ModelRenderOptions,
  ModelWebGlBuffer,
  ModelWebGlBuffers,
} from "../types/model-data";
import { ProgramInfo } from "../types/program-info";
import { GlMatrix } from "./gl-matrix";

export abstract class GlModel {
  abstract readonly uri: string;
  private asset: GltfAsset | null = null;
  protected webGlPrimitiveBuffers: ModelWebGlBuffers | null = null;
  protected nodeTransformation: GlMatrix | null = null;

  constructor(
    public gl: WebGLRenderingContext,
    public programInfo: ProgramInfo
  ) {}

  public async load(): Promise<void> {
    const loader = new GltfLoader();
    const asset: GltfAsset = await loader.load(this.uri);
    this.asset = asset;
    const primitives: { [key: string]: GltfPrimitiveData } = await this.parse();
    this.initBuffers(primitives);
  }

  public abstract render(options: ModelRenderOptions): void;

  protected renderPrimitives(modelViewMatrix: GlMatrix) {
    if (this.nodeTransformation) {
      modelViewMatrix.multiplyRight(this.nodeTransformation.m);
    }

    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix.m
    );
    for (const primitiveKey in this.webGlPrimitiveBuffers) {
      const webGlPrimitiveBuffer = this.webGlPrimitiveBuffers[primitiveKey];
      this.renderPrimitive(webGlPrimitiveBuffer);
    }
  }

  private async parse(): Promise<{ [key: string]: GltfPrimitiveData }> {
    if (!this.asset) {
      throw new Error("Data has not been loaded");
    }
    const primitives: { [key: string]: GltfPrimitiveData } =
      await this.parseBufferViews(this.asset);
    this.nodeTransformation = this.calcNodeTransformations(this.asset);

    return primitives;
  }

  private async parseBufferViews(
    asset: GltfAsset
  ): Promise<{ [key: string]: GltfPrimitiveData }> {
    const gltf = asset.gltf;
    const binaryChunk = asset.glbData?.binaryChunk;
    if (!binaryChunk) {
      throw new Error("The gltf doesn't contain binary chunk");
    }
    const bufferViews = gltf.bufferViews || [];
    const buffers = [];
    for (let index = 0; index < bufferViews.length; index++) {
      buffers.push(await asset.bufferViewData(index));
    }

    if (buffers.length < 5) {
      throw new Error("Wrong set of buffers");
    }

    const result: { [key: string]: GltfPrimitiveData } = {};
    const accessors = gltf.accessors || [];

    if (!gltf.meshes) {
      throw new Error("There aren't meshes in the model file");
    }

    for (const mesh of gltf.meshes) {
      const { name, primitives } = mesh;
      if (!primitives.length) {
        throw new Error("Empty primitive");
      }
      const { attributes = {}, indices = -1 } = primitives[0] || {};
      const primitiveGeometry: GltfPrimitiveData = {
        attributes: {},
        vertexCount: 0,
      };
      for (const attrKey in attributes) {
        const accessor = accessors[attributes[attrKey]];
        if (accessor === undefined) {
          throw new Error("An accessor has not been found");
        }
        const bufferViewIndex = accessor.bufferView;
        if (bufferViewIndex === undefined) {
          throw new Error("An accessor doesn't contain bufferView");
        }
        const TypedArrayConstructor =
          COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
        const buffer = buffers[bufferViewIndex];
        primitiveGeometry.attributes[attrKey] = {
          ctor: TypedArrayConstructor,
          components: COMPONENTS_MAP[accessor.type],
          buffer: new TypedArrayConstructor(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT
          ),
        };
      }
      if (indices >= 0) {
        const accessor = accessors[indices];
        const bufferViewIndex = accessor.bufferView;
        if (bufferViewIndex === undefined) {
          throw new Error("An accessor has not been found");
        }
        const TypedArrayConstructor =
          COMPONENT_TYPE_MAP[accessor.componentType] || Uint8Array;
        const buffer = buffers[bufferViewIndex];
        primitiveGeometry.indices = new TypedArrayConstructor(
          binaryChunk.buffer,
          buffer.byteOffset,
          buffer.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT
        );
        primitiveGeometry.vertexCount = primitiveGeometry.indices.length;
      } else {
        const positionAttribute = primitiveGeometry.attributes.POSITION;
        if (!positionAttribute) {
          throw new Error("Model doesn't contain POSITION attribute");
        }
        primitiveGeometry.vertexCount =
          positionAttribute.buffer.length / positionAttribute.components;
      }
      result[name] = primitiveGeometry;
    }

    return result;
  }

  private calcNodeTransformations(asset: GltfAsset): GlMatrix {
    const gltf = asset.gltf;
    const node = (gltf.nodes && gltf.nodes[0]) || {};
    const result = new GlMatrix();
    if (node.rotation) {
      result.rotateWithQuaternion(
        node.rotation[0],
        node.rotation[1],
        node.rotation[2],
        node.rotation[3]
      );
    }
    return result;
  }

  private initBuffers(primitives: { [key: string]: GltfPrimitiveData }) {
    this.webGlPrimitiveBuffers = {};
    for (const primitiveKey in primitives) {
      const primitive = primitives[primitiveKey];
      const {
        attributes: { POSITION, COLOR_0, NORMAL },
        indices,
      } = primitive;
      if (!(POSITION && COLOR_0 && NORMAL)) {
        throw new Error("A primitive doesn't contain necessary attributes");
      }

      this.webGlPrimitiveBuffers[primitiveKey] = {
        position: this.gl.createBuffer(),
        color: this.gl.createBuffer(),
        normal: this.gl.createBuffer(),
        index: null,
        vertexCount: primitive.vertexCount,
      };

      this.gl.bindBuffer(
        this.gl.ARRAY_BUFFER,
        this.webGlPrimitiveBuffers[primitiveKey].position
      );
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        POSITION.buffer,
        this.gl.STATIC_DRAW
      );

      this.gl.bindBuffer(
        this.gl.ARRAY_BUFFER,
        this.webGlPrimitiveBuffers[primitiveKey].color
      );
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        COLOR_0.buffer,
        this.gl.STATIC_DRAW
      );

      this.gl.bindBuffer(
        this.gl.ARRAY_BUFFER,
        this.webGlPrimitiveBuffers[primitiveKey].normal
      );
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        NORMAL.buffer,
        this.gl.STATIC_DRAW
      );

      if (indices) {
        this.webGlPrimitiveBuffers[primitiveKey].index = this.gl.createBuffer();
        this.gl.bindBuffer(
          this.gl.ELEMENT_ARRAY_BUFFER,
          this.webGlPrimitiveBuffers[primitiveKey].index
        );
        this.gl.bufferData(
          this.gl.ELEMENT_ARRAY_BUFFER,
          indices,
          this.gl.STATIC_DRAW
        );
      }
    }
  }

  private renderPrimitive(webGlPrimitiveBuffer: ModelWebGlBuffer) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, webGlPrimitiveBuffer.position);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexPosition
      );
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
      const numComponents = 4;
      const type = this.gl.UNSIGNED_SHORT;
      const normalize = true;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, webGlPrimitiveBuffer.color);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexColor
      );
    }

    // Tell WebGL how to pull out the normals from the normal buffer
    // into the vertexNormal attribute.
    {
      const numComponents = 3;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, webGlPrimitiveBuffer.normal);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexNormal
      );
    }

    const offset = 0;
    const vertexCount = webGlPrimitiveBuffer.vertexCount;
    if (webGlPrimitiveBuffer.index) {
      this.gl.bindBuffer(
        this.gl.ELEMENT_ARRAY_BUFFER,
        webGlPrimitiveBuffer.index
      );
      const type = this.gl.UNSIGNED_SHORT;
      this.gl.drawElements(
        this.gl.TRIANGLES,
        webGlPrimitiveBuffer.vertexCount,
        type,
        offset
      );
    } else {
      this.gl.drawArrays(this.gl.TRIANGLES, offset, vertexCount);
    }
  }
}
