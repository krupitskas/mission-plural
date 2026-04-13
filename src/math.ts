// All math is f64 (native JS numbers). Only convert to f32 at the GPU boundary.

export type Vec3 = [number, number, number];
export type Mat4 = Float32Array; // GPU-ready, 4x4 column-major

export const vec3 = {
  create(x = 0, y = 0, z = 0): Vec3 {
    return [x, y, z];
  },

  add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },

  sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  scale(v: Vec3, s: number): Vec3 {
    return [v[0] * s, v[1] * s, v[2] * s];
  },

  length(v: Vec3): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },

  normalize(v: Vec3): Vec3 {
    const len = vec3.length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },

  cross(a: Vec3, b: Vec3): Vec3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  },

  dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
  },
};

export const mat4 = {
  create(): Mat4 {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },

  perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const m = new Float32Array(16);
    const f = 1.0 / Math.tan(fovY / 2);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = far / (near - far);
    m[11] = -1;
    m[14] = (near * far) / (near - far);
    return m;
  },

  lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const z = vec3.normalize(vec3.sub(eye, target));
    const x = vec3.normalize(vec3.cross(up, z));
    const y = vec3.cross(z, x);

    const m = new Float32Array(16);
    m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0;
    m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0;
    m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
    m[12] = -vec3.dot(x, eye);
    m[13] = -vec3.dot(y, eye);
    m[14] = -vec3.dot(z, eye);
    m[15] = 1;
    return m;
  },

  multiply(a: Mat4, b: Mat4): Mat4 {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[j * 4 + i] =
          a[i] * b[j * 4] +
          a[4 + i] * b[j * 4 + 1] +
          a[8 + i] * b[j * 4 + 2] +
          a[12 + i] * b[j * 4 + 3];
      }
    }
    return out;
  },

  rotateY(m: Mat4, angle: number): Mat4 {
    const r = mat4.create();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    r[0] = c; r[8] = s;
    r[2] = -s; r[10] = c;
    return mat4.multiply(m, r);
  },

  rotateX(m: Mat4, angle: number): Mat4 {
    const r = mat4.create();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    r[5] = c; r[9] = -s;
    r[6] = s; r[10] = c;
    return mat4.multiply(m, r);
  },
};
