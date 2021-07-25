import { GlMatrix } from '../../core/gl-matrix';
import { GlModel } from '../../core/gl-model';
import { ModelRenderOptions } from '../../types/model-data';

export class Taganka8Model extends GlModel {
  public readonly uri: string = "http://localhost:8080/taganka8.glb";
  public render({viewMatrix}: ModelRenderOptions) {
    const modelViewMatrix = new GlMatrix().multiplyRight(viewMatrix.m);
    const scaleMatrix = new GlMatrix().scale(10, 10, 10);
    modelViewMatrix.multiplyRight(scaleMatrix.m);
    this.renderPrimitives(modelViewMatrix);
  }
}
