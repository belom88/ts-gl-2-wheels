import { GlContext } from "./core/gl-context";
import { Taganka8Scene } from "./scenes/taganka8/taganka8-scene";

import "./index.scss";
import { Point } from "./types/point";
import { GlCamera } from "./core/gl-camera";
import { GlVector } from "./core/gl-vector";

const glContext: GlContext = new GlContext("canvas");

let delta = 0;
const canvasElement: HTMLCanvasElement =
  document.getElementsByTagName("canvas")[0];
canvasElement.addEventListener("mousedown", canvasMouseDown);
canvasElement.addEventListener("mousemove", canvasMouseMove);
canvasElement.addEventListener("mouseleave", canvasDragEnd);
canvasElement.addEventListener("mouseup", canvasDragEnd);
canvasElement.addEventListener("wheel", canvasZoom);
document.addEventListener("keypress", (e) => {
  if (e.key === '.' || e.key === '>' || e.key === 'ю') {
    delta+=7;
  } else if (e.key === ',' || e.key === '<' || e.key === 'б') {
    delta-=7;
  }
  render(0);
});

if (glContext.gl === null) {
  throw new Error("Gl context hasn't been found");
}

const camera = new GlCamera(30, 20, 50, 0, 0, 5);
const scene = new Taganka8Scene(glContext.gl, camera);
let thenTime: number = 0;

const animationAngleSpan = document.getElementById("animationAngle");
const movementVectorSpan = document.getElementById("movementVector");
const positionVectorSpan = document.getElementById("positionVector");

function render(nowTime: number) {
  nowTime *= 0.1; // convert to seconds
  const deltaTime = nowTime - thenTime;
  thenTime = nowTime;
  scene.drawScene(deltaTime);
  delta = 0;
  requestAnimationFrame(render);
  if (animationAngleSpan) {
    animationAngleSpan.innerText =
      scene.wheels?.rearDirectionAngle.toString() || "";
  }
  if (movementVectorSpan) {
    movementVectorSpan.innerHTML =
      scene.wheels?.movementVector.magnitude.toString() || "";
  }
  if (positionVectorSpan) {
    const vector = scene.wheels?.postitionStat || new GlVector(0, 0, 0);
    positionVectorSpan.innerHTML = `[${vector.v[0]}, ${vector.v[1]}, ${vector.v[2]}]`;
  }
}

scene.loadModel().then(() => {
  scene.prepareScene();
  // Draw the scene repeatedly
  requestAnimationFrame(render);
});

let inDrag: boolean = false;
let inRotation: boolean = false;
let dragStart: Point = { x: 0, y: 0 };
function canvasMouseDown(event: MouseEvent) {
  dragStart = {
    x: event.clientX,
    y: event.clientY,
  };

  if (event.ctrlKey) {
    inRotation = true;
  } else {
    inDrag = true;
  }
}

function canvasMouseMove(event: MouseEvent) {
  let dragDelta: Point = { x: 0, y: 0 };
  dragDelta = {
    x: event.clientX - dragStart.x,
    y: event.clientY - dragStart.y,
  };
  if (inDrag) {
    dragDelta.x *= 0.05;
    dragDelta.y *= 0.05;
    if (event.ctrlKey) {
      inRotation = true;
      inDrag = false;
      return;
    }
    camera.move(dragDelta);
  }
  if (inRotation) {
    if (!event.ctrlKey) {
      inRotation = false;
      inDrag = true;
      return;
    }
    camera.rotate(dragDelta);
  }
  dragStart = {
    x: event.clientX,
    y: event.clientY,
  };
}

function canvasDragEnd() {
  inDrag = false;
  inRotation = false;
}

function canvasZoom(event: WheelEvent) {
  event.preventDefault();
  camera.zoom(event.deltaY * 0.1);
}
