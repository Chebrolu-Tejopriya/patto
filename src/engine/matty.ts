import { HEADER, MASK, TECH } from './techniques';

/** Dense counted-thread embroidery inspired by the supplied matty-work sample.
 * Each image sample becomes a padded stitch with bundled fibres and recessed
 * canvas holes. The whole image is stitched, including light tones. */
export const MATTY_FRAG = HEADER + TECH + MASK + `
// A yarn bundle is several twisted plies, with a soft fibrous silhouette.
vec4 yarnBundle(vec2 p, vec2 a, vec2 b, float width, vec3 colour, float seed, float px){
  vec2 axis = normalize(b - a);
  vec2 normal = vec2(-axis.y, axis.x);
  float along = dot(p - a, axis);
  float across = dot(p - a, normal);
  float span = length(b - a);
  float bend = sin(along * 8.0 + seed * TAU) * 0.018;
  across += bend;
  float end = max(-along, along - span);
  float dist = length(vec2(across, max(end, 0.0)));
  float twist = across / width * 1.1 + along * 2.8 + seed;
  float ply = 0.5 + 0.5 * cos(twist * TAU);
  float fuzz = hash(floor(p * 95.0) + seed * 41.0);
  float radius = width * (0.94 + 0.06 * sin(along * 31.0 + seed * TAU));
  float aa = 0.55 / px;
  float coverage = 1.0 - smoothstep(radius - aa, radius + aa + 0.012, dist + (fuzz - 0.5) * 0.018);
  float crown = sqrt(max(0.0, 1.0 - pow(clamp(dist / radius, 0.0, 1.0), 2.0)));
  float detail = smoothstep(5.0, 13.0, px);
  float lighting = 0.70 + 0.30 * crown - 0.08 * across / width;
  lighting *= 1.0 - detail * 0.24 * pow(1.0 - ply, 3.0);
  lighting += (fuzz - 0.5) * 0.12 * detail;
  return vec4(colour * mix(1.0, lighting, u_shade), coverage);
}
void main(){
  float px = max(u_pixel, 5.0);
  vec2 P = vUv * u_res;
  // Slightly uneven canvas tension, continuous across cell boundaries.
  P += px * 0.035 * vec2(sin(P.y / px * 1.7), sin(P.x / px * 1.3));
  vec2 cell = floor(P / px);
  vec2 f = fract(P / px) - 0.5;
  vec2 cuv = (cell + 0.5) * px / u_res;
  // Average a small footprint to retain thin features without sharp sample aliasing.
  vec2 offset = vec2(0.22 * px) / u_res;
  vec3 c = texture(u_image, cuv).rgb * 0.4;
  c += (texture(u_image, cuv + offset).rgb + texture(u_image, cuv - offset).rgb
      + texture(u_image, cuv + vec2(offset.x, -offset.y)).rgb
      + texture(u_image, cuv + vec2(-offset.x, offset.y)).rgb) * 0.15;
  float lum = luma(c);
  float tone = clamp((u_invert > 0.5 ? 1.0 - lum : lum) + (0.5 - u_threshold) * 0.7, 0.0, 1.0);
  float levels = floor(3.0 + clamp(u_dither, 0.0, 1.0) * 7.0);
  float q = floor(tone * (levels - 1.0) + 0.5) / (levels - 1.0);
  vec3 thread = q < 0.5 ? mix(u_ink, u_mid, q * 2.0) : mix(u_mid, u_paper, q * 2.0 - 1.0);
  if(u_keep > 0.5) thread = clamp(c * ((0.04 + q * 0.96) / max(lum, 0.04)), 0.0, 1.0);

  float seed = hash(cell + 4.3);
  vec2 p = rot(f, (seed - 0.5) * 0.16);
  p -= (vec2(hash(cell + 1.7), hash(cell + 8.2)) - 0.5) * 0.04;
  float width = (0.19 + u_gap * 0.12) * (0.94 + seed * 0.12);
  float weave = 0.5 + 0.5 * sin(f.x * TAU * 3.0) * sin(f.y * TAU * 3.0);
  vec3 fabric = mix(u_ink, thread, 0.45) * (0.52 + weave * 0.12);
  float shimmer = u_breathe * 0.045 * sin(u_phase * TAU + cuv.x * TAU);
  if(u_iMode == 2) shimmer += iFall(cuv) * u_iAmt * 0.22;
  thread *= (0.91 + 0.18 * seed) * (1.0 + shimmer);
  vec2 a = vec2(-0.20, -0.20), b = vec2(0.20, 0.20);
  vec2 c1 = vec2(-0.20, 0.20), d = vec2(0.20, -0.20);
  vec4 lower = yarnBundle(p, a, b, width, thread, seed, px);
  vec4 upper = yarnBundle(p, c1, d, width, thread, seed + 0.37, px);
  vec4 shadow = yarnBundle(p - vec2(0.025, -0.035), c1, d, width + 0.025, thread, seed + 0.37, px);
  vec3 col = mix(fabric, lower.rgb, lower.a);
  col *= 1.0 - shadow.a * 0.27 * u_shade;
  col = mix(col, upper.rgb, upper.a);
  float m = subjectMask(vUv);
  vec3 bg = u_bgMode > 0.5 ? fabric : texture(u_image, vUv).rgb;
  outColor = vec4(mix(bg, col, m), 1.0);
}
`;

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
