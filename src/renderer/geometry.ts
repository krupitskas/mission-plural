/**
 * Generate a UV sphere.
 * Returns interleaved vertex data: [px, py, pz, nx, ny, nz, u, v] per vertex
 * and u16 index buffer.
 */
export function createSphere(
  radius: number,
  latBands: number,
  lonBands: number,
): {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer>;
  indexCount: number;
} {
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
