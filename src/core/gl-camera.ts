import { degreesToRadians } from "../tools/angles";
import { Point } from "../types/point";
import { ProjectionData } from "../types/projection";
import { GlMatrix } from "./gl-matrix";
import { GlVector } from "./gl-vector";

export class GlCamera {
  private _eye: GlVector;
  private _center: GlVector;
  private _up: GlVector = new GlVector(0, 1, 0);

  public maxElevation: number = 100;
  public minElevation: number = 4;
  public maxCameraAngle: number = 0.5;

  constructor(
    eyeX: number,
    eyeY: number,
    eyeZ: number,
    centerX: number = 0,
    centerY: number = 0,
    centerZ: number = 0,
    public gl: WebGLRenderingContext,
    public projectionData: ProjectionData
  ) {
    this._eye = new GlVector(eyeX, eyeY, eyeZ);
    this._center = new GlVector(centerX, centerY, centerZ);
  }

  get eye() {
    return this._eye.copy();
  }

  get center() {
    return this._center.copy();
  }

  get up() {
    return this._up.copy();
  }

  get toEye(): GlVector {
    return this._eye.copy().subtract(this._center);
  }

  move(delta: Point) {
    const toEyeVector = this.toEye;
    const zAxisVector = new GlVector(0, 0, 1);
    const angle = new GlVector(
      toEyeVector.v[0],
      0,
      toEyeVector.v[2]
    ).angleBetween(zAxisVector, this.up);
    const rotatedDelta: Point = { x: 0, y: 0 };
    const { width, height } = this.gl.canvas;
    const { fieldOfView, zNear, aspect } = this.projectionData;
    const yh = zNear * Math.tan(degreesToRadians(fieldOfView / 2)) * 2;
    const yw = yh * aspect;
    const ratio = toEyeVector.magnitude / zNear;
    const worldUnitsMoved: Point = {
      x: yw / width,
      y: yh / height,
    };
    delta.x *= worldUnitsMoved.x * ratio;
    delta.y *= worldUnitsMoved.y * ratio;
    rotatedDelta.x = delta.x * Math.cos(angle) + delta.y * Math.sin(angle);
    rotatedDelta.y = delta.x * -Math.sin(angle) + delta.y * Math.cos(angle);
    this._eye.v[0] += -rotatedDelta.x;
    this._eye.v[2] += -rotatedDelta.y;
    this._center.v[0] += -rotatedDelta.x;
    this._center.v[2] += -rotatedDelta.y;
  }

  // x means rotation about y axis
  // y means rotation about axis ortogonal to canvas X axis
  rotate(delta: Point) {
    const toEyeVector = this.toEye;
    const rotationMatrix = new GlMatrix().rotate(-delta.x, 0, 1, 0);
    const zAxisVector = new GlVector(0, 0, 1);
    const toEyeAndUpAngle = toEyeVector.angleBetween(this._up, this.up);
    if (Math.abs(toEyeAndUpAngle) > this.maxCameraAngle || delta.y < 0) {
      const angle = toEyeVector.angleBetween(zAxisVector, this.up);
      // Rotate x axis on angle
      const x = Math.cos(angle);
      const z = -Math.sin(angle);
      rotationMatrix.rotate(-delta.y, x, 0, z);
    }

    toEyeVector.transform(rotationMatrix);
    if (this._center.v[1] + toEyeVector.v[1] < 2) {
      return;
    }
    this._eye.v[0] = this._center.v[0] + toEyeVector.v[0];
    this._eye.v[1] = this._center.v[1] + toEyeVector.v[1];
    this._eye.v[2] = this._center.v[2] + toEyeVector.v[2];
  }

  zoom(extraMagnitude: number) {
    const toEyeVector = this.toEye;
    const magnitude = toEyeVector.magnitude;
    let resultMagnitude = magnitude + extraMagnitude;
    if (resultMagnitude > this.maxElevation) {
      return;
    }
    if (resultMagnitude < this.minElevation) {
      resultMagnitude = this.minElevation;
    }
    toEyeVector.normalize();
    toEyeVector.scale(resultMagnitude);
    this._eye.v[0] = this._center.v[0] + toEyeVector.v[0];
    this._eye.v[1] = this._center.v[1] + toEyeVector.v[1];
    this._eye.v[2] = this._center.v[2] + toEyeVector.v[2];
  }
}
