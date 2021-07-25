import { GlMatrix } from "../../core/gl-matrix";
import { initShaderProgram } from "../../core/gl-shader";
import { ProgramInfo } from "../../types/program-info";
import { Taganka8Model } from "./taganka8-model";
import vertexShaderSource from "./taganka8.vert.glsl";
import fragmentShaderSource from "./taganka8.frag.glsl";
import { GlCamera } from "../../core/gl-camera";
import { WheelsModel } from "./wheels-model";

export class Taganka8Scene {
  private vsSource: string = vertexShaderSource;
  private fsSource: string = fragmentShaderSource;
  wheels: WheelsModel | null = null;
  terrain: Taganka8Model | null = null;

  private programInfo: ProgramInfo | null = null;

  constructor(public gl: WebGLRenderingContext, public camera: GlCamera) {
    const program = initShaderProgram(gl, this.vsSource, this.fsSource);
    if (!program) {
      return;
    }
    this.programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
        vertexColor: gl.getAttribLocation(program, "aVertexColor"),
        vertexNormal: gl.getAttribLocation(program, "aVertexNormal"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
      },
    };
  }

  public async loadModel() {
    if (!this.programInfo) {
      throw Error("Shaders haven't been compiled correctly");
    }
    this.wheels = new WheelsModel(this.gl, this.programInfo, this.camera);
    await this.wheels.load();
    this.terrain = new Taganka8Model(this.gl, this.programInfo);
    await this.terrain.load();
  }

  public prepareScene() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clearDepth(1.0); // Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); // Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); // Near things obscure far things

    if (!this.programInfo) {
      throw Error("Shaders haven't been compiled correctly");
    }

    // Tell WebGL to use our program when drawing
    this.gl.useProgram(this.programInfo.program);

    const fieldOfView = 45;
    const aspect = this.gl.canvas.width / this.gl.canvas.height;
    const zNear = 0.5;
    const zFar = 1000.0;
    const projectionMatrix = new GlMatrix().perspective(
      fieldOfView,
      aspect,
      zNear,
      zFar
    );
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix.m
    );
  }

  public drawScene(deltaTime: number) {
    // Clear the canvas before we start drawing on it.
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    if (!this.programInfo) {
      throw Error("Shaders has't been compiled correctly");
    }

    const viewMatrix = new GlMatrix().lookAt(
      this.camera.eye,
      this.camera.center,
      this.camera.up
    );
    this.wheels?.render({ viewMatrix, deltaTime });
    this.terrain?.render({ viewMatrix });
  }
}
