export const vertexShader = /* wgsl */ `
struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  eye: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VSIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

@vertex
fn main(input: VSIn) -> VSOut {
  var out: VSOut;
  let worldPos = (u.model * vec4(input.position, 1.0)).xyz;
  out.pos = u.mvp * vec4(input.position, 1.0);
  out.normal = (u.model * vec4(input.normal, 0.0)).xyz;
  out.worldPos = worldPos;
  out.uv = input.uv;
  return out;
}
`;

export const fragmentShader = /* wgsl */ `
struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  eye: vec3<f32>,
  time: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn main(
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
  let N = normalize(normal);
  let V = normalize(u.eye - worldPos);

  // Sun direction (fixed, distant)
  let L = normalize(vec3(1.0, 0.3, 0.5));

  // Diffuse
  let NdotL = max(dot(N, L), 0.0);

  // Latitude-based coloring: ocean blue + land green/brown
  let lat = asin(N.y) / (3.14159 / 2.0); // -1 to 1
  let lon = atan2(N.z, N.x);

  // Simple procedural Earth colors
  let noise = fract(sin(dot(vec2(lon * 3.0, lat * 5.0), vec2(12.9898, 78.233))) * 43758.5453);
  let isLand = step(0.45, noise);

  let ocean = vec3(0.05, 0.12, 0.35);
  let land = mix(vec3(0.15, 0.3, 0.1), vec3(0.35, 0.25, 0.1), noise);
  let ice = vec3(0.85, 0.9, 0.95);

  var baseColor = mix(ocean, land, isLand);

  // Polar ice caps
  let polar = smoothstep(0.65, 0.85, abs(lat));
  baseColor = mix(baseColor, ice, polar);

  // Lighting
  let ambient = vec3(0.02, 0.03, 0.05);
  let diffuse = baseColor * NdotL;

  // Atmosphere rim glow
  let rim = 1.0 - max(dot(N, V), 0.0);
  let atmosphere = vec3(0.3, 0.5, 1.0) * pow(rim, 3.0) * 0.6;

  // Night side subtle glow (city lights feel)
  let nightGlow = vec3(0.8, 0.6, 0.2) * pow(max(1.0 - NdotL, 0.0), 8.0) * isLand * 0.03;

  let color = ambient + diffuse + atmosphere + nightGlow;

  // Tone map
  let mapped = color / (color + vec3(1.0));

  return vec4(mapped, 1.0);
}
`;
