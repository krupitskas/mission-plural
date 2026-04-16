import { Vec3, vec3 } from "../math";

export class OrbitCamera {
  distance: number;
  azimuth: number;
  elevation: number;
  target: Vec3 = [0, 0, 0];

  private targetDistance: number;
  private targetAzimuth: number;
  private targetElevation: number;
  private desiredTarget: Vec3 = [0, 0, 0];

  private minDist: number;
  private maxDist: number;
  private minElev = -Math.PI / 2 + 0.05;
  private maxElev = Math.PI / 2 - 0.05;

  private isDragging = false;
  private activePointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  private smoothing = 8;

  constructor(
    distance: number,
    azimuth: number,
    elevation: number,
    minDist = 1.5,
    maxDist = 50,
  ) {
    this.distance = this.targetDistance = distance;
    this.azimuth = this.targetAzimuth = azimuth;
    this.elevation = this.targetElevation = elevation;
    this.minDist = minDist;
    this.maxDist = maxDist;
  }

  attach(canvas: HTMLCanvasElement) {
    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 2) {
        return;
      }
      this.isDragging = true;
      this.activePointerId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.isDragging || e.pointerId !== this.activePointerId) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.targetAzimuth -= dx * 0.005;
      this.targetElevation += dy * 0.005;
      this.targetElevation = Math.max(
        this.minElev,
        Math.min(this.maxElev, this.targetElevation),
      );
    });

    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId !== this.activePointerId) return;
      this.isDragging = false;
      this.activePointerId = null;
      canvas.releasePointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointercancel", (e) => {
      if (e.pointerId !== this.activePointerId) return;
      this.isDragging = false;
      this.activePointerId = null;
      canvas.releasePointerCapture(e.pointerId);
    });

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.targetDistance *= 1 + e.deltaY * 0.001;
        this.targetDistance = Math.max(
          this.minDist,
          Math.min(this.maxDist, this.targetDistance),
        );
      },
      { passive: false },
    );
  }

  update(dt: number) {
    const t = 1 - Math.exp(-this.smoothing * dt);
    this.distance += (this.targetDistance - this.distance) * t;
    this.azimuth += (this.targetAzimuth - this.azimuth) * t;
    this.elevation += (this.targetElevation - this.elevation) * t;
    this.target = vec3.lerp(this.target, this.desiredTarget, t);
  }

  setTarget(target: Vec3, immediate = false) {
    this.desiredTarget = vec3.clone(target);
    if (immediate) {
      this.target = vec3.clone(target);
    }
  }

  focusOn(target: Vec3, distance: number, minDist: number, maxDist: number) {
    this.minDist = minDist;
    this.maxDist = maxDist;
    this.target = vec3.clone(target);
    this.desiredTarget = vec3.clone(target);
    const clampedDistance = Math.max(this.minDist, Math.min(this.maxDist, distance));
    this.distance = clampedDistance;
    this.targetDistance = clampedDistance;
  }

  getEye(): Vec3 {
    const cosE = Math.cos(this.elevation);
    return [
      this.target[0] + this.distance * cosE * Math.sin(this.azimuth),
      this.target[1] + this.distance * Math.sin(this.elevation),
      this.target[2] + this.distance * cosE * Math.cos(this.azimuth),
    ];
  }
}
