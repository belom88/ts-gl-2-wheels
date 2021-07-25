import { GlMatrix } from "./gl-matrix";

export class GlVector {
  v: Float32Array = new Float32Array(3);

  constructor(x: number, y: number, z: number) {
    this.v.set([x, y, z]);
  }

  copy(): GlVector {
    return new GlVector(this.v[0], this.v[1], this.v[2]);
  }

  public divide(scalar: number): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] / scalar;
    }
    return this;
  }

  public add(v: GlVector): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] + v.v[i];
    }
    return this;
  }

  public subtract(v: GlVector): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] - v.v[i];
    }
    return this;
  }

  get magnitude(): number {
    return Math.sqrt(
      this.v[0] * this.v[0] + this.v[1] * this.v[1] + this.v[2] * this.v[2]
    );
  }

  public normalize(): GlVector {
    const magnitude = this.magnitude;
    if (magnitude === 0) {
      this.v.set([0, 0, 0]);
      return this;
    }
    return this.divide(magnitude);
  }

  public invert(): GlVector {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = -this.v[i];
    }
    return this;
  }

  public scale(scalar: number): GlVector {
    let result: number = 0;
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i] * scalar;
    }
    return this;
  }

  public crossProduct(v: GlVector): GlVector {
    const result = new Float32Array(3);
    result[0] = this.v[1] * v.v[2] - this.v[2] * v.v[1];
    result[1] = this.v[2] * v.v[0] - this.v[0] * v.v[2];
    result[2] = this.v[0] * v.v[1] - this.v[1] * v.v[0];
    this.v = result;
    return this;
  }

  public dotProduct(v: GlVector): number {
    let result: number = 0;
    for (let i = 0; i < this.v.length; i++) {
      result += this.v[i] * v.v[i];
    }
    return result;
  }

  public tripleProduct(v1: GlVector, v2: GlVector) {
    const cross = v1.copy().crossProduct(v2);
    return this.dotProduct(cross);
  }

  public angleBetween(v: GlVector, up: GlVector): number {
    let angle = Math.acos(this.dotProduct(v) / (this.magnitude * v.magnitude));
    const triple = up.invert().tripleProduct(this, v);
    if (triple < 0) {
      return 2 * Math.PI - angle;
    }
    return angle;
  }

  public transform(m: GlMatrix) {
    const result = this.copy();
    result.v[0] = this.v[0] * m.m[0] + this.v[1] * m.m[4] + this.v[2] * m.m[8];
    result.v[1] = this.v[0] * m.m[1] + this.v[1] * m.m[5] + this.v[2] * m.m[9];
    result.v[2] = this.v[0] * m.m[2] + this.v[1] * m.m[6] + this.v[2] * m.m[10];
    this.v = result.v;
    return result;
  }
}
