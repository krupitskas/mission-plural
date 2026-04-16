struct Uniforms {
  mvp: mat4x4<f32>,
  model: mat4x4<f32>,
  eyeTime: vec4<f32>,
  baseColor: vec4<f32>,
  material: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn main(
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) localPos: vec3<f32>,
) -> @location(0) vec4<f32> {
  let materialKind = u.material.x;
  let emissiveStrength = max(u.material.y, 1.0);

  let lat = asin(clamp(localPos.y, -1.0, 1.0));
  let lon = atan2(localPos.z, localPos.x);
  let hash = fract(
    sin(dot(vec2(lon * 4.3, lat * 7.1), vec2(12.9898, 78.233))) * 43758.5453,
  );

  var baseColor = u.baseColor.rgb;
  var color = baseColor;

  if (materialKind < 3.5) {
    let variation = 0.82 + hash * 0.18;
    color = baseColor * variation;

    if (materialKind < 1.5) {
      let polar = smoothstep(1.0, 1.45, abs(lat));
      color = mix(color, vec3(0.92, 0.95, 0.98), polar * 0.2);
    } else if (materialKind < 2.5) {
      let maria = smoothstep(0.55, 0.9, hash);
      color = mix(color, baseColor * 0.72, maria * 0.35);
    } else {
      let panelBand = smoothstep(0.3, 1.15, abs(localPos.x));
      color = mix(color, vec3(0.95, 0.98, 1.0), panelBand * 0.35);
      let hub = smoothstep(0.15, 0.0, abs(localPos.y));
      color = mix(color, vec3(0.76, 0.86, 1.0), hub * 0.2);
    }
  } else if (materialKind < 4.5) {
    let pulse = 0.9 + 0.1 * sin(u.eyeTime.w * 0.0006 + uv.x * 6.28318);
    color = baseColor * emissiveStrength * pulse;
  } else {
    let radial = clamp(length(localPos.xz), 0.0, 1.0);
    let core = smoothstep(1.0, 0.0, radial);
    let flare = 0.92 + 0.08 * sin(u.eyeTime.w * 0.0002 + lon * 8.0);
    color = mix(baseColor * 0.92, vec3(1.0, 0.9, 0.55), core * 0.45);
    color *= (1.0 + emissiveStrength * 0.35) * flare;
  }

  return vec4(color, u.baseColor.a);
}
