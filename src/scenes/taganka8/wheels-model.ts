import { GlMatrix } from "../../core/gl-matrix";
import { ProgramInfo } from "../../types/program-info";
import { GlVector } from "../../core/gl-vector";
import { GlCamera } from "../../core/gl-camera";
import { GlModel } from "../../core/gl-model";
import { WheelsModelRenderOptions } from "./types/wheels-model-types";

export class WheelsModel extends GlModel {
  private readonly tireRadius: number = 0.51;
  private readonly wheelBase: number = 4;
  private readonly startPosition: [number, number, number] = [5, 1, 15];
  public readonly uri: string = "http://localhost:8080/wheel.glb";

  private _frontWheelRotationAngle: number = 0;
  private _rearWheelRotationAngle: number = 0;
  private frontWheelDirectionMatrix: GlMatrix = new GlMatrix();
  private frontPosition: GlVector = new GlVector(this.wheelBase / 2 + 5, 0, 10);

  private rearPosition: GlVector = new GlVector(-this.wheelBase / 2 + 5, 0, 10);

  get postitionStat(): GlVector {
    return this.frontPosition;
  }

  public movementVector: GlVector = new GlVector(0, 0, 0);
  public rearDirectionAngle: number = 0;

  set frontWheelRotationAngle(value: number) {
    this._frontWheelRotationAngle = value;
    if (this._frontWheelRotationAngle > 360) {
      this._frontWheelRotationAngle = 0;
    }
  }

  get frontWheelRotationAngle(): number {
    return this._frontWheelRotationAngle;
  }

  set rearWheelRotationAngle(value: number) {
    this._rearWheelRotationAngle = value;
    if (this._rearWheelRotationAngle > 360) {
      this._rearWheelRotationAngle = 0;
    }
  }

  get rearWheelRotationAngle(): number {
    return this._rearWheelRotationAngle;
  }

  constructor(
    public gl: WebGLRenderingContext,
    public programInfo: ProgramInfo,
    public camera: GlCamera
  ) {
    super(gl, programInfo);
  }

  public render({viewMatrix, deltaTime}: WheelsModelRenderOptions) {
    const modelViewMatrix = new GlMatrix();

    modelViewMatrix.multiplyRight(viewMatrix.m);

    const translationMatrix = new GlMatrix().translate(...this.startPosition);
    modelViewMatrix.multiplyRight(translationMatrix.m);

    this.renderFrontWheel(deltaTime, modelViewMatrix);
    this.renderRearWheel(modelViewMatrix);
  }

  private renderFrontWheel(deltaTime: number, modelViewMatrix: GlMatrix) {
    deltaTime *= 1;
    this.frontWheelRotationAngle += deltaTime;

    const frontWheelModelMatrix = new GlMatrix().multiplyRight(
      modelViewMatrix.m
    );

    this.frontWheelDirectionMatrix.rotate(deltaTime / 15, 0, 1, 0);
    const frontWheelMovementVector: GlVector = new GlVector(1, 0, 0);
    frontWheelMovementVector.transform(this.frontWheelDirectionMatrix);

    const frontWheelMovementDistance =
      2 * Math.PI * this.tireRadius * (deltaTime / 360);
    frontWheelMovementVector.scale(frontWheelMovementDistance);
    this.movementVector = frontWheelMovementVector;
    this.frontPosition.add(frontWheelMovementVector);
    const frontWheelMovementTranslationMatrix = new GlMatrix().translate(
      this.frontPosition.v[0],
      this.frontPosition.v[1],
      this.frontPosition.v[2]
    );
    frontWheelModelMatrix.multiplyRight(frontWheelMovementTranslationMatrix.m);

    frontWheelModelMatrix.multiplyRight(this.frontWheelDirectionMatrix.m);

    const rotationMatrix = new GlMatrix().rotate(
      -this.frontWheelRotationAngle,
      0,
      0,
      1
    );
    frontWheelModelMatrix.multiplyRight(rotationMatrix.m);

    this.renderPrimitives(frontWheelModelMatrix);
  }

  private renderRearWheel(modelViewMatrix: GlMatrix) {
    const rearWheelModelMatrix = new GlMatrix().multiplyRight(
      modelViewMatrix.m
    );
    const rearFrontSegment = this.frontPosition
      .copy()
      .subtract(this.rearPosition);
    const rearWheelMovementDistance =
      rearFrontSegment.magnitude - this.wheelBase;
    const rearWheelMovementVector = rearFrontSegment
      .normalize()
      .scale(rearWheelMovementDistance);
    this.rearPosition.add(rearWheelMovementVector);
    const rearWheelMovementTranslationMatrix = new GlMatrix().translate(
      this.rearPosition.v[0],
      this.rearPosition.v[1],
      this.rearPosition.v[2]
    );
    rearWheelModelMatrix.multiplyRight(rearWheelMovementTranslationMatrix.m);

    const rearDirectionVector = this.frontPosition
      .copy()
      .subtract(this.rearPosition)
      .normalize();
    this.rearDirectionAngle = rearDirectionVector.angleBetween(
      new GlVector(1, 0, 0),
      this.camera.up
    );
    const matrix = new GlMatrix().rotate(
      (this.rearDirectionAngle * 180) / Math.PI,
      0,
      1,
      0
    );
    rearWheelModelMatrix.multiplyRight(matrix.m);

    this.rearWheelRotationAngle +=
      (rearWheelMovementDistance * 360) / (2 * Math.PI * this.tireRadius);
    const rearWheelRotationMatrix = new GlMatrix().rotate(
      -this.rearWheelRotationAngle,
      0,
      0,
      1
    );
    rearWheelModelMatrix.multiplyRight(rearWheelRotationMatrix.m);

    this.renderPrimitives(rearWheelModelMatrix);
  }
}
