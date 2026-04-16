import { Vec3, vec3 } from "../math";
import type { MeshData } from "./geometry";

export function createOrbitTube(
  points: Vec3[],
  tubeRadius: number,
  radialSegments = 10,
): MeshData {
  const verts: number[] = [];
  const idxs: number[] = [];
  const pointCount = points.length;
  const ringStride = radialSegments + 1;
  const orbitNormal = estimateOrbitNormal(points);

  for (let i = 0; i < pointCount; i++) {
    const prev = points[(i - 1 + pointCount) % pointCount];
    const curr = points[i];
    const next = points[(i + 1) % pointCount];
    const tangent = vec3.normalize(vec3.sub(next, prev));
    const side = vec3.normalize(vec3.cross(orbitNormal, tangent));
    const up = vec3.normalize(vec3.cross(tangent, side));

    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const offset = vec3.add(
        vec3.scale(side, Math.cos(angle) * tubeRadius),
        vec3.scale(up, Math.sin(angle) * tubeRadius),
      );
      const position = vec3.add(curr, offset);
      const normal = vec3.normalize(offset);

      verts.push(position[0], position[1], position[2]);
      verts.push(normal[0], normal[1], normal[2]);
      verts.push(i / pointCount, j / radialSegments);
    }
  }

  for (let i = 0; i < pointCount; i++) {
    const nextRing = (i + 1) % pointCount;

    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringStride + j;
      const b = nextRing * ringStride + j;

      idxs.push(a, b, a + 1);
      idxs.push(b, b + 1, a + 1);
    }
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    indexCount: idxs.length,
  };
}

function estimateOrbitNormal(points: Vec3[]): Vec3 {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const c = points[(i + 2) % points.length];
    const normal = vec3.cross(vec3.sub(b, a), vec3.sub(c, b));
    if (vec3.length(normal) > 1e-8) {
      return vec3.normalize(normal);
    }
  }

  return [0, 1, 0];
}
