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
  let L = normalize(vec3(1.0, 0.3, 0.5));
  let NdotL = max(dot(N, L), 0.0);

  let lat = asin(N.y) / (3.14159 / 2.0);
  let lon = atan2(N.z, N.x);

  let noise = fract(
    sin(dot(vec2(lon * 3.0, lat * 5.0), vec2(12.9898, 78.233))) * 43758.5453,
  );
  let isLand = step(0.45, noise);

  let ocean = vec3(0.05, 0.12, 0.35);
  let land = mix(vec3(0.15, 0.3, 0.1), vec3(0.35, 0.25, 0.1), noise);
  let ice = vec3(0.85, 0.9, 0.95);

  var baseColor = mix(ocean, land, isLand);

  let polar = smoothstep(0.65, 0.85, abs(lat));
  baseColor = mix(baseColor, ice, polar);

  let ambient = vec3(0.02, 0.03, 0.05);
  let diffuse = baseColor * NdotL;

  let rim = 1.0 - max(dot(N, V), 0.0);
  let atmosphere = vec3(0.3, 0.5, 1.0) * pow(rim, 3.0) * 0.6;

  let nightGlow =
    vec3(0.8, 0.6, 0.2) * pow(max(1.0 - NdotL, 0.0), 8.0) * isLand * 0.03;
  let color = ambient + diffuse + atmosphere + nightGlow;
  let mapped = color / (color + vec3(1.0));

  return vec4(mapped, 1.0);
}
