import { Vec3 } from "../math";

export type MeshData = {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer>;
  indexCount: number;
};

/**
 * Generate a UV sphere.
 * Returns interleaved vertex data: [px, py, pz, nx, ny, nz, u, v] per vertex
 * and u16 index buffer.
 */
export function createSphere(
  radius: number,
  latBands: number,
  lonBands: number,
): MeshData {
  const verts: number[] = [];
  const idxs: number[] = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      const nx = cosP * sinT;
      const ny = cosT;
      const nz = sinP * sinT;

      const u = lon / lonBands;
      const v = lat / latBands;

      verts.push(radius * nx, radius * ny, radius * nz);
      verts.push(nx, ny, nz);
      verts.push(u, v);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const a = lat * (lonBands + 1) + lon;
      const b = a + lonBands + 1;

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

export function createStubShip(): MeshData {
  const verts: number[] = [];
  const idxs: number[] = [];

  appendBox(verts, idxs, [0, 0, 0], [0.32, 0.2, 1.1]);
  appendBox(verts, idxs, [0, 0, 0], [0.1, 0.1, 2.8]);
  appendBox(verts, idxs, [-1.35, 0, 0], [2.0, 0.03, 0.72]);
  appendBox(verts, idxs, [1.35, 0, 0], [2.0, 0.03, 0.72]);
  appendBox(verts, idxs, [0, 0.18, 0.5], [0.16, 0.12, 0.42]);
  appendBox(verts, idxs, [0, -0.14, -0.55], [0.14, 0.08, 0.32]);

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    indexCount: idxs.length,
  };
}

function appendBox(
  verts: number[],
  idxs: number[],
  center: Vec3,
  size: Vec3,
) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size;
  const hx = sx * 0.5;
  const hy = sy * 0.5;
  const hz = sz * 0.5;

  const p000: Vec3 = [cx - hx, cy - hy, cz - hz];
  const p001: Vec3 = [cx - hx, cy - hy, cz + hz];
  const p010: Vec3 = [cx - hx, cy + hy, cz - hz];
  const p011: Vec3 = [cx - hx, cy + hy, cz + hz];
  const p100: Vec3 = [cx + hx, cy - hy, cz - hz];
  const p101: Vec3 = [cx + hx, cy - hy, cz + hz];
  const p110: Vec3 = [cx + hx, cy + hy, cz - hz];
  const p111: Vec3 = [cx + hx, cy + hy, cz + hz];

  appendQuad(verts, idxs, p001, p101, p111, p011, [0, 0, 1]);
  appendQuad(verts, idxs, p100, p000, p010, p110, [0, 0, -1]);
  appendQuad(verts, idxs, p000, p001, p011, p010, [-1, 0, 0]);
  appendQuad(verts, idxs, p101, p100, p110, p111, [1, 0, 0]);
  appendQuad(verts, idxs, p010, p011, p111, p110, [0, 1, 0]);
  appendQuad(verts, idxs, p000, p100, p101, p001, [0, -1, 0]);
}

function appendQuad(
  verts: number[],
  idxs: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  normal: Vec3,
) {
  const start = verts.length / 8;
  pushVertex(verts, a, normal, [0, 0]);
  pushVertex(verts, b, normal, [1, 0]);
  pushVertex(verts, c, normal, [1, 1]);
  pushVertex(verts, d, normal, [0, 1]);
  idxs.push(start, start + 1, start + 2);
  idxs.push(start, start + 2, start + 3);
}

function pushVertex(
  verts: number[],
  position: Vec3,
  normal: Vec3,
  uv: [number, number],
) {
  verts.push(position[0], position[1], position[2]);
  verts.push(normal[0], normal[1], normal[2]);
  verts.push(uv[0], uv[1]);
}
