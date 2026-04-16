struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  eyeTime: vec4<f32>,
  baseColor: vec4<f32>,
  material: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) localPos: vec3<f32>,
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
  out.localPos = input.position;
  return out;
}
