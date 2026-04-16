import { Vec3 } from "../math";

type OrbitalElements = {
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationRad: number;
  ascendingNodeRad: number;
  argumentOfPeriapsisRad: number;
  meanAnomalyAtEpochRad: number;
  epochSeconds?: number;
  centralMuKm3S2: number;
};

export type OrbitState = {
  positionKm: Vec3;
  velocityKmPerSec: Vec3;
  radiusKm: number;
  trueAnomalyRad: number;
};

export class Orbit {
  readonly semiMajorAxisKm: number;
  readonly eccentricity: number;
  readonly inclinationRad: number;
  readonly ascendingNodeRad: number;
  readonly argumentOfPeriapsisRad: number;
  readonly meanAnomalyAtEpochRad: number;
  readonly epochSeconds: number;
  readonly centralMuKm3S2: number;

  constructor(elements: OrbitalElements) {
    this.semiMajorAxisKm = elements.semiMajorAxisKm;
    this.eccentricity = elements.eccentricity;
    this.inclinationRad = elements.inclinationRad;
    this.ascendingNodeRad = elements.ascendingNodeRad;
    this.argumentOfPeriapsisRad = elements.argumentOfPeriapsisRad;
    this.meanAnomalyAtEpochRad = elements.meanAnomalyAtEpochRad;
    this.epochSeconds = elements.epochSeconds ?? 0;
    this.centralMuKm3S2 = elements.centralMuKm3S2;
  }

  meanMotionRadPerSec(): number {
    return Math.sqrt(
      this.centralMuKm3S2 / (this.semiMajorAxisKm * this.semiMajorAxisKm * this.semiMajorAxisKm),
    );
  }

  periodSeconds(): number {
    return (Math.PI * 2) / this.meanMotionRadPerSec();
  }

  planeNormal(): Vec3 {
    return this.rotateVector([0, 0, 1]);
  }

  stateAtTime(timeSeconds: number): OrbitState {
    const meanAnomaly = normalizeAngle(
      this.meanAnomalyAtEpochRad +
        this.meanMotionRadPerSec() * (timeSeconds - this.epochSeconds),
    );
    const eccentricAnomaly = solveKeplerEquation(
      meanAnomaly,
      this.eccentricity,
    );

    const cosE = Math.cos(eccentricAnomaly);
    const sinE = Math.sin(eccentricAnomaly);
    const semiMinorAxisKm =
      this.semiMajorAxisKm * Math.sqrt(1 - this.eccentricity * this.eccentricity);
    const radiusKm = this.semiMajorAxisKm * (1 - this.eccentricity * cosE);
    const orbitalX = this.semiMajorAxisKm * (cosE - this.eccentricity);
    const orbitalY = semiMinorAxisKm * sinE;
    const denom = 1 - this.eccentricity * cosE;
    const meanMotion = this.meanMotionRadPerSec();
    const orbitalVx = (-this.semiMajorAxisKm * meanMotion * sinE) / denom;
    const orbitalVy = (semiMinorAxisKm * meanMotion * cosE) / denom;
    const trueAnomaly = Math.atan2(
      Math.sqrt(1 - this.eccentricity * this.eccentricity) * sinE,
      cosE - this.eccentricity,
    );

    return {
      positionKm: this.rotateVector([orbitalX, orbitalY, 0]),
      velocityKmPerSec: this.rotateVector([orbitalVx, orbitalVy, 0]),
      radiusKm,
      trueAnomalyRad: trueAnomaly,
    };
  }

  samplePositions(sampleCount: number): Vec3[] {
    const points: Vec3[] = [];
    const safeSamples = Math.max(3, sampleCount);
    const semiMinorAxisKm =
      this.semiMajorAxisKm * Math.sqrt(1 - this.eccentricity * this.eccentricity);

    for (let i = 0; i < safeSamples; i++) {
      const eccentricAnomaly = (i / safeSamples) * Math.PI * 2;
      const cosE = Math.cos(eccentricAnomaly);
      const sinE = Math.sin(eccentricAnomaly);
      points.push(
        this.rotateVector([
          this.semiMajorAxisKm * (cosE - this.eccentricity),
          semiMinorAxisKm * sinE,
          0,
        ]),
      );
    }

    return points;
  }

  private rotateVector(vector: Vec3): Vec3 {
    const cosO = Math.cos(this.ascendingNodeRad);
    const sinO = Math.sin(this.ascendingNodeRad);
    const cosI = Math.cos(this.inclinationRad);
    const sinI = Math.sin(this.inclinationRad);
    const cosW = Math.cos(this.argumentOfPeriapsisRad);
    const sinW = Math.sin(this.argumentOfPeriapsisRad);

    const m11 = cosO * cosW - sinO * sinW * cosI;
    const m12 = -cosO * sinW - sinO * cosW * cosI;
    const m13 = sinO * sinI;
    const m21 = sinO * cosW + cosO * sinW * cosI;
    const m22 = -sinO * sinW + cosO * cosW * cosI;
    const m23 = -cosO * sinI;
    const m31 = sinW * sinI;
    const m32 = cosW * sinI;
    const m33 = cosI;

    const rotated: Vec3 = [
      m11 * vector[0] + m12 * vector[1] + m13 * vector[2],
      m21 * vector[0] + m22 * vector[1] + m23 * vector[2],
      m31 * vector[0] + m32 * vector[1] + m33 * vector[2],
    ];

    // Present orbital planes in XZ by default so Y remains the scene's "up" axis.
    return [rotated[0], -rotated[2], rotated[1]];
  }
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function solveKeplerEquation(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;

  for (let i = 0; i < 8; i++) {
    const sinE = Math.sin(eccentricAnomaly);
    const cosE = Math.cos(eccentricAnomaly);
    const f = eccentricAnomaly - eccentricity * sinE - meanAnomaly;
    const fp = 1 - eccentricity * cosE;
    eccentricAnomaly -= f / fp;
  }

  return eccentricAnomaly;
}
