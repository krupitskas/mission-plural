import { Vec3, vec3 } from "../math";
import { Orbit } from "./orbit";

const DEG_TO_RAD = Math.PI / 180;
const AU_KM = 149_597_870.7;
const SUN_MU_KM3_S2 = 132_712_440_018;
const SUN_RADIUS_KM = 695_700;
const EARTH_RADIUS_KM = 6_371;
const MOON_RADIUS_KM = 1_737.4;
const EARTH_MU_KM3_S2 = 398_600.4418;
const EARTH_AXIAL_TILT_RAD = 23.439281 * DEG_TO_RAD;
const EARTH_SIDEREAL_DAY_S = 86_164.0905;
const MOON_ROTATION_PERIOD_S = 27.321661 * 86_400;
const SIMULATION_TIME_SCALE = 120;
const SHIP_PHYSICAL_RADIUS_KM = 0.055;
const SHIP_VISUAL_SCALE_SCENE = 0.045;
const SUN_VISUAL_SCALE_SCENE = 7.2;
const MOON_VISUAL_SCALE_SCENE = 0.28;
// Orbital states stay in real-ish kilometers, but the solar-system preview uses
// compressed visual distances so the scene remains readable in one camera.
const MOON_VISUAL_ORBIT_RADIUS_SCENE = 2.35;
const SHIP_VISUAL_ORBIT_RADIUS_SCENE = 1.08;

export type CameraTargetId =
  | "sun"
  | "earth"
  | "moon"
  | "ship"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type CameraTargetOption = {
  id: CameraTargetId;
  label: string;
};

export type CameraTargetState = {
  id: CameraTargetId;
  label: string;
  positionKm: Vec3;
  positionScene: Vec3;
  radiusKm: number;
  suggestedDistance: number;
  minDistance: number;
  maxDistance: number;
  kmPerSceneUnit: number;
};

export type BodyState = {
  id: CameraTargetId;
  label: string;
  positionKm: Vec3;
  velocityKmPerSec: Vec3;
  positionScene: Vec3;
  radiusKm: number;
  visualScaleScene: number;
  materialKind: number;
  baseColor: [number, number, number, number];
  emissiveStrength: number;
  spinRad: number;
  axialTiltRad: number;
};

export type OrbitVisual = {
  id: string;
  anchorId: CameraTargetId | null;
  pointsScene: Vec3[];
  tubeRadius: number;
  radialSegments: number;
  color: [number, number, number, number];
};

type SolarBodyConfig = {
  id: Exclude<CameraTargetId, "sun" | "moon" | "ship">;
  label: string;
  radiusKm: number;
  visualOrbitRadiusScene: number;
  baseColor: [number, number, number, number];
  orbitColor: [number, number, number, number];
  spinPeriodSeconds: number;
  axialTiltRad: number;
  orbit: Orbit;
};

const SOLAR_BODIES: SolarBodyConfig[] = [
  {
    id: "mercury",
    label: "Mercury",
    radiusKm: 2_439.7,
    visualOrbitRadiusScene: 7.5,
    baseColor: [0.74, 0.71, 0.68, 1],
    orbitColor: [0.92, 0.86, 0.8, 1],
    spinPeriodSeconds: 58.646 * 86_400,
    axialTiltRad: 0.03 * DEG_TO_RAD,
    orbit: createSolarOrbit(0.387098, 0.20563, 2.2),
  },
  {
    id: "venus",
    label: "Venus",
    radiusKm: 6_051.8,
    visualOrbitRadiusScene: 11.2,
    baseColor: [0.93, 0.76, 0.48, 1],
    orbitColor: [1.0, 0.88, 0.58, 1],
    spinPeriodSeconds: -243.025 * 86_400,
    axialTiltRad: 177.36 * DEG_TO_RAD,
    orbit: createSolarOrbit(0.723332, 0.0068, 0.8),
  },
  {
    id: "earth",
    label: "Earth",
    radiusKm: EARTH_RADIUS_KM,
    visualOrbitRadiusScene: 15.8,
    baseColor: [0.13, 0.23, 0.42, 1],
    orbitColor: [0.35, 0.86, 1.0, 1],
    spinPeriodSeconds: EARTH_SIDEREAL_DAY_S,
    axialTiltRad: EARTH_AXIAL_TILT_RAD,
    orbit: createSolarOrbit(1, 0.0167, 5.1),
  },
  {
    id: "mars",
    label: "Mars",
    radiusKm: 3_389.5,
    visualOrbitRadiusScene: 20.4,
    baseColor: [0.86, 0.42, 0.28, 1],
    orbitColor: [0.96, 0.56, 0.38, 1],
    spinPeriodSeconds: 88_642.6848,
    axialTiltRad: 25.19 * DEG_TO_RAD,
    orbit: createSolarOrbit(1.523679, 0.0934, 3.6),
  },
  {
    id: "jupiter",
    label: "Jupiter",
    radiusKm: 69_911,
    visualOrbitRadiusScene: 28.4,
    baseColor: [0.88, 0.69, 0.55, 1],
    orbitColor: [0.98, 0.8, 0.64, 1],
    spinPeriodSeconds: 35_729.856,
    axialTiltRad: 3.13 * DEG_TO_RAD,
    orbit: createSolarOrbit(5.2044, 0.0489, 1.2),
  },
  {
    id: "saturn",
    label: "Saturn",
    radiusKm: 58_232,
    visualOrbitRadiusScene: 35,
    baseColor: [0.91, 0.82, 0.6, 1],
    orbitColor: [0.98, 0.9, 0.68, 1],
    spinPeriodSeconds: 38_362,
    axialTiltRad: 26.73 * DEG_TO_RAD,
    orbit: createSolarOrbit(9.5826, 0.0565, 4.4),
  },
  {
    id: "uranus",
    label: "Uranus",
    radiusKm: 25_362,
    visualOrbitRadiusScene: 41.2,
    baseColor: [0.63, 0.88, 0.94, 1],
    orbitColor: [0.78, 0.97, 1.0, 1],
    spinPeriodSeconds: -62_064,
    axialTiltRad: 97.77 * DEG_TO_RAD,
    orbit: createSolarOrbit(19.2184, 0.0463, 2.8),
  },
  {
    id: "neptune",
    label: "Neptune",
    radiusKm: 24_622,
    visualOrbitRadiusScene: 46.4,
    baseColor: [0.35, 0.54, 0.97, 1],
    orbitColor: [0.52, 0.7, 1.0, 1],
    spinPeriodSeconds: 57_996,
    axialTiltRad: 28.32 * DEG_TO_RAD,
    orbit: createSolarOrbit(30.11, 0.0095, 5.7),
  },
];

export class OrbitalScene {
  readonly moonOrbit = new Orbit({
    semiMajorAxisKm: 384_400,
    eccentricity: 0.0549,
    inclinationRad: 0,
    ascendingNodeRad: 0,
    argumentOfPeriapsisRad: 0,
    meanAnomalyAtEpochRad: 1.3,
    centralMuKm3S2: EARTH_MU_KM3_S2,
  });

  readonly shipOrbit = new Orbit({
    semiMajorAxisKm: EARTH_RADIUS_KM + 420,
    eccentricity: 0.0006,
    inclinationRad: 0,
    ascendingNodeRad: 0,
    argumentOfPeriapsisRad: 0,
    meanAnomalyAtEpochRad: 4.9,
    centralMuKm3S2: EARTH_MU_KM3_S2,
  });

  private simulationTimeSeconds = 0;

  update(dtSeconds: number) {
    this.simulationTimeSeconds += dtSeconds * SIMULATION_TIME_SCALE;
  }

  getTimeSeconds(): number {
    return this.simulationTimeSeconds;
  }

  sceneToKm(sceneUnits: number): number {
    return sceneUnits * EARTH_RADIUS_KM;
  }

  getTargetOptions(): CameraTargetOption[] {
    const earthIndex = SOLAR_BODIES.findIndex((body) => body.id === "earth");
    const innerPlanets = SOLAR_BODIES.slice(0, earthIndex);
    const outerPlanets = SOLAR_BODIES.slice(earthIndex + 1);

    return [
      { id: "sun", label: "Sun" },
      { id: "earth", label: "Earth" },
      { id: "moon", label: "Moon" },
      { id: "ship", label: "Ship" },
      ...innerPlanets.map(({ id, label }) => ({ id, label })),
      ...outerPlanets.map(({ id, label }) => ({ id, label })),
    ];
  }

  getOrbitVisuals(): OrbitVisual[] {
    const solarOrbitVisuals = SOLAR_BODIES.map((body) => ({
      id: `orbit-${body.id}`,
      anchorId: null,
      pointsScene: projectOrbitSamples(
        body.orbit,
        body.visualOrbitRadiusScene,
        body.id === "earth" ? 256 : 192,
      ),
      tubeRadius: body.id === "earth" ? 0.012 : 0.01,
      radialSegments: 8,
      color: body.orbitColor,
    }));

    return [
      ...solarOrbitVisuals,
      {
        id: "orbit-moon",
        anchorId: "earth",
        pointsScene: projectOrbitSamples(
          this.moonOrbit,
          MOON_VISUAL_ORBIT_RADIUS_SCENE,
          192,
        ),
        tubeRadius: 0.016,
        radialSegments: 8,
        color: [0.96, 0.96, 1.0, 1],
      },
      {
        id: "orbit-ship",
        anchorId: "earth",
        pointsScene: projectOrbitSamples(
          this.shipOrbit,
          SHIP_VISUAL_ORBIT_RADIUS_SCENE,
          160,
        ),
        tubeRadius: 0.008,
        radialSegments: 8,
        color: [0.32, 1.0, 1.0, 1],
      },
    ];
  }

  getBodies(): BodyState[] {
    const solarBodies = SOLAR_BODIES.map((body) => this.buildSolarBody(body));
    const earth = solarBodies.find((body) => body.id === "earth");

    if (!earth) {
      return [];
    }

    const moonState = this.moonOrbit.stateAtTime(this.simulationTimeSeconds);
    const shipState = this.shipOrbit.stateAtTime(this.simulationTimeSeconds);
    const moonOffsetScene = projectRelativePosition(
      moonState.positionKm,
      this.moonOrbit.semiMajorAxisKm,
      MOON_VISUAL_ORBIT_RADIUS_SCENE,
    );
    const shipOffsetScene = projectRelativePosition(
      shipState.positionKm,
      this.shipOrbit.semiMajorAxisKm,
      SHIP_VISUAL_ORBIT_RADIUS_SCENE,
    );

    return [
      {
        id: "sun",
        label: "Sun",
        positionKm: [0, 0, 0],
        velocityKmPerSec: [0, 0, 0],
        positionScene: [0, 0, 0],
        radiusKm: SUN_RADIUS_KM,
        visualScaleScene: SUN_VISUAL_SCALE_SCENE,
        materialKind: 5,
        baseColor: [0.98, 0.72, 0.26, 1],
        emissiveStrength: 1.2,
        spinRad:
          (this.simulationTimeSeconds / (25.05 * 86_400)) * Math.PI * 2,
        axialTiltRad: 7.25 * DEG_TO_RAD,
      },
      ...solarBodies,
      {
        id: "moon",
        label: "Moon",
        positionKm: vec3.add(earth.positionKm, moonState.positionKm),
        velocityKmPerSec: vec3.add(earth.velocityKmPerSec, moonState.velocityKmPerSec),
        positionScene: vec3.add(earth.positionScene, moonOffsetScene),
        radiusKm: MOON_RADIUS_KM,
        visualScaleScene: MOON_VISUAL_SCALE_SCENE,
        materialKind: 2,
        baseColor: [0.68, 0.7, 0.74, 1],
        emissiveStrength: 0.03,
        spinRad:
          (this.simulationTimeSeconds / MOON_ROTATION_PERIOD_S) * Math.PI * 2,
        axialTiltRad: 6.68 * DEG_TO_RAD,
      },
      {
        id: "ship",
        label: "Ship",
        positionKm: vec3.add(earth.positionKm, shipState.positionKm),
        velocityKmPerSec: vec3.add(earth.velocityKmPerSec, shipState.velocityKmPerSec),
        positionScene: vec3.add(earth.positionScene, shipOffsetScene),
        radiusKm: SHIP_PHYSICAL_RADIUS_KM,
        visualScaleScene: SHIP_VISUAL_SCALE_SCENE,
        materialKind: 3,
        baseColor: [0.8, 0.86, 0.94, 1],
        emissiveStrength: 0.24,
        spinRad: 0,
        axialTiltRad: 0,
      },
    ];
  }

  getCameraTarget(id: CameraTargetId): CameraTargetState {
    const body = this.getBodies().find((entry) => entry.id === id);
    if (!body) {
      return this.getCameraTarget("earth");
    }

    if (id === "sun") {
      return {
        ...baseTarget(body),
        suggestedDistance: 24,
        minDistance: 9,
        maxDistance: 280,
      };
    }

    if (id === "earth") {
      return {
        ...baseTarget(body),
        suggestedDistance: 6.4,
        minDistance: 1.7,
        maxDistance: 120,
      };
    }

    if (id === "moon") {
      return {
        ...baseTarget(body),
        suggestedDistance: 1.8,
        minDistance: 0.45,
        maxDistance: 40,
      };
    }

    if (id === "ship") {
      return {
        ...baseTarget(body),
        suggestedDistance: 0.34,
        minDistance: 0.1,
        maxDistance: 8,
      };
    }

    return {
      ...baseTarget(body),
      suggestedDistance: Math.max(2, body.visualScaleScene * 3.8),
      minDistance: Math.max(0.5, body.visualScaleScene * 0.8),
      maxDistance: Math.max(40, body.visualScaleScene * 22),
    };
  }

  private buildSolarBody(config: SolarBodyConfig): BodyState {
    const state = config.orbit.stateAtTime(this.simulationTimeSeconds);
    return {
      id: config.id,
      label: config.label,
      positionKm: state.positionKm,
      velocityKmPerSec: state.velocityKmPerSec,
      positionScene: projectRelativePosition(
        state.positionKm,
        config.orbit.semiMajorAxisKm,
        config.visualOrbitRadiusScene,
      ),
      radiusKm: config.radiusKm,
      visualScaleScene: visualBodyScale(config.radiusKm),
      materialKind: 1,
      baseColor: config.baseColor,
      emissiveStrength: 0,
      spinRad:
        (this.simulationTimeSeconds / config.spinPeriodSeconds) * Math.PI * 2,
      axialTiltRad: config.axialTiltRad,
    };
  }
}

function createSolarOrbit(
  semiMajorAxisAu: number,
  eccentricity: number,
  meanAnomalyAtEpochRad: number,
): Orbit {
  return new Orbit({
    semiMajorAxisKm: semiMajorAxisAu * AU_KM,
    eccentricity,
    inclinationRad: 0,
    ascendingNodeRad: 0,
    argumentOfPeriapsisRad: 0,
    meanAnomalyAtEpochRad,
    centralMuKm3S2: SUN_MU_KM3_S2,
  });
}

function projectOrbitSamples(
  orbit: Orbit,
  visualSemiMajorAxisScene: number,
  sampleCount: number,
): Vec3[] {
  return orbit
    .samplePositions(sampleCount)
    .map((positionKm) =>
      projectRelativePosition(
        positionKm,
        orbit.semiMajorAxisKm,
        visualSemiMajorAxisScene,
      ),
    );
}

function projectRelativePosition(
  positionKm: Vec3,
  referenceSemiMajorAxisKm: number,
  visualSemiMajorAxisScene: number,
): Vec3 {
  const radiusKm = vec3.length(positionKm);
  if (radiusKm <= 0 || referenceSemiMajorAxisKm <= 0) {
    return [0, 0, 0];
  }

  const direction = vec3.scale(positionKm, 1 / radiusKm);
  const visualRadius = visualSemiMajorAxisScene * (radiusKm / referenceSemiMajorAxisKm);
  return vec3.scale(direction, visualRadius);
}

function visualBodyScale(radiusKm: number): number {
  const earthRadii = radiusKm / EARTH_RADIUS_KM;
  if (earthRadii <= 1) {
    return Math.max(0.24, earthRadii);
  }

  return Math.min(3.2, 1 + Math.log2(earthRadii) * 0.9);
}

function baseTarget(body: BodyState): CameraTargetState {
  return {
    id: body.id,
    label: body.label,
    positionKm: body.positionKm,
    positionScene: body.positionScene,
    radiusKm: body.radiusKm,
    suggestedDistance: 1,
    minDistance: 0.1,
    maxDistance: 100,
    kmPerSceneUnit: body.radiusKm / Math.max(body.visualScaleScene, 1e-6),
  };
}

export {
  EARTH_AXIAL_TILT_RAD,
  EARTH_RADIUS_KM,
  EARTH_SIDEREAL_DAY_S,
  EARTH_MU_KM3_S2,
  MOON_RADIUS_KM,
  SHIP_VISUAL_SCALE_SCENE,
};
