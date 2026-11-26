// Second batch of techniques, each derived from specific pins of the board.
// They share the TECH uniform block and the MASK helpers with techniques.ts.
import { HEADER, MASK, TECH } from './techniques';

/** Gapped cell mosaic (pins 2, 9, 28, 44, 53, 27). Tone is quantised to a few
 * levels; each level owns a mark: none, dot, plus, ring, disc, square, square-with-x,
 * half square or a full fill. Ordered dither between neighbouring levels gives the
 * density gradients of the pieces; colours are the image's own hue at each level. */
export const CELLS_FRAG = HEADER + TECH + MASK + `
uniform int u_marks[8];
uniform int u_ground;
uniform sampler2D u_trail;
// 8x8 Bayer: finer density steps between levels than the 4x4 (pins 9, 53)
const int B8[64] = int[64](
  0,32,8,40,2,34,10,42, 48,16,56,24,50,18,58,26, 12,44,4,36,14,46,6,38, 60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41, 51,19,59,27,49,17,57,25, 15,47,7,39,13,45,5,37, 63,31,55,23,61,29,53,21);
vec3 colourOf(vec3 c, float lum, float lvl, float n){
  float Lq = (lvl + 0.5) / n;
  if(u_keep > 0.5) return clamp(c * (Lq / max(lum, 1e-3)), 0.0, 1.0);
  float t = lvl / max(n - 1.0, 1.0);
  return t < 0.5 ? mix(u_ink, u_mid, t * 2.0) : mix(u_mid, u_paper, t * 2.0 - 1.0);
}
// signed coverage of a mark inside the cell, f in 0..1, size s in cell units
float markCov(int kind, vec2 f, float s, float aa, vec2 cell){
  vec2 d = f - 0.5;
  float r = s * 0.5;
  if(kind == 0) return 0.0;
  if(kind == 9 || kind == 10){                                                                       // halftone screen inside the cell (pins 56, 62)
    float n = kind == 9 ? 4.0 : 2.0;
    vec2 sf = fract(f * n) - 0.5;
    float rr = 0.18 + s * 0.22;
    return 1.0 - smoothstep(rr - aa * n, rr + aa * n, length(sf));
  }
  if(kind == 11){ float w = r * 0.16; return max(step(abs(d.x - d.y) * 0.7071, w) * step(max(abs(d.x), abs(d.y)), r), step(abs(d.x + d.y) * 0.7071, w) * step(max(abs(d.x), abs(d.y)), r)); } // x cross (pin 59 ground)
  if(kind == 12){ vec2 e = min(f, 1.0 - f); return step(min(e.x, e.y), 0.04 + s * 0.06); }        // grid lines on the cell edges (pin 59 figure)
  if(kind == 13){                                                                                    // stipple: a small dot at a random spot (pin 69)
    vec2 o = (vec2(hash(cell + 5.1), hash(cell + 9.7)) - 0.5) * 0.6;
    float rr = r * 0.42 * (0.75 + 0.5 * hash(cell + 2.3));
    return 1.0 - smoothstep(rr - aa, rr + aa, length(d - o));
  }
  if(kind == 1){ return 1.0 - smoothstep(r * 0.35 - aa, r * 0.35 + aa, length(d)); }               // small dot
  if(kind == 2){ float w = r * 0.22; float a = step(abs(d.x), w) * step(abs(d.y), r); float b = step(abs(d.y), w) * step(abs(d.x), r); return max(a, b); } // plus
  if(kind == 3){ float l = length(d); return (1.0 - smoothstep(r - aa, r + aa, l)) * smoothstep(r * 0.62 - aa, r * 0.62 + aa, l); } // ring
  if(kind == 4){ return 1.0 - smoothstep(r - aa, r + aa, length(d)); }                              // disc
  if(kind == 5){ return step(max(abs(d.x), abs(d.y)), r); }                                          // square
  if(kind == 6){ float sq = step(max(abs(d.x), abs(d.y)), r); float x = max(step(abs(d.x - d.y), r * 0.2), step(abs(d.x + d.y), r * 0.2)); return sq * (1.0 - 0.55 * x); } // square with x
  if(kind == 7){ return step(abs(d.x), r * 0.5) * step(abs(d.y), r); }                             // half square
  return 1.0;                                                                                        // 8 = full fill
}
void main(){
  float px = max(u_pixel, 3.0);
  vec2 P = vUv * u_res;
  vec2 cell = floor(P / px);
  vec2 f = fract(P / px);
  vec2 cuv = (cell + 0.5) * px / u_res;
  vec3 c = texture(u_image, cuv).rgb;
  float lum = luma(c);
  if(u_invert > 0.5) lum = 1.0 - lum;
  float n = clamp(floor(u_depth) + 1.0, 2.0, 8.0);
  float lf = clamp(lum + (0.5 - u_threshold) * 0.6, 0.0, 0.9999) * (n - 1.0);
  float lo = floor(lf);
  float fr = lf - lo;
  ivec2 ic = ivec2(cell);
  float bay = (float(B8[(ic.y & 7) * 8 + (ic.x & 7)]) + 0.5) / 64.0;
  float lvl = (fr * u_dither > bay * u_dither && u_dither > 0.01) ? lo + 1.0 : lo;
  lvl = min(lvl, n - 1.0);
  // trail (hover) lifts the level so marks bloom under the pointer and fade back
  float tr = texture(u_trail, cuv).r;
  if(u_iMode == 4) lvl = min(n - 1.0, lvl + floor(tr * 2.5));
  // random dropout for the dissolving LED boards
  if(u_shade > 0.0 && hash(cell + 3.3) < u_shade * (1.0 - lum)) lvl = 0.0;
  int kind = u_marks[int(lvl)];
  vec3 base = u_keep > 0.5 ? colourOf(c, lum, max(lvl - 1.0, 0.0), n) : u_paper;
  if(u_bgMode > 0.5 && u_keep > 0.5 && lvl < 0.5) base = u_paper;
  vec3 mk = colourOf(c, lum, lvl, n);
  if(u_keep < 0.5 && lvl < 0.5) mk = base;
  if(kind == 12 && u_keep < 0.5) mk = vec3(1.0);                 // the grid mark is always white ink
  float size = 0.35 + u_gap * 0.65;
  float cov = markCov(kind, f, size, 0.8 / px, cell);
  float pulse = 1.0 + u_breathe * 0.08 * sin(u_phase * TAU + hash(cell) * TAU);
  vec3 col = mix(base, mk * pulse, cov);
  // background: plain, or tiled with the ground mark in a darker tint of itself
  float m = subjectMask(vUv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, vUv).rgb;
  if(u_ground > 0){
    float gc = markCov(u_ground, f, size, 0.8 / px, cell);
    bg = mix(bg, bg * 0.76, gc);
  }
  outColor = vec4(mix(bg, col, m), 1.0);
}
`;

/** Cross stitch, rebuilt (pins 5, 8, 45, 41): aida fabric everywhere, stitches only on
 * the subject. Each X is two rounded threads with a lit crown and a shadow cast onto
 * the fabric and onto the thread beneath, so the stitches have volume. */
export const STITCH_FRAG = HEADER + TECH + MASK + `
float capsule(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
void main(){
  float px = max(u_pixel, 5.0);
  vec2 P = vUv * u_res;
  vec2 cell = floor(P / px);
  vec2 f = fract(P / px);
  vec2 cuv = (cell + 0.5) * px / u_res;
  vec3 c = texture(u_image, cuv).rgb;
  float lum = luma(c);
  if(u_invert > 0.5) lum = 1.0 - lum;

  // aida: light weave with a dark seam grid and a square hole at each corner
  vec2 e = min(f, 1.0 - f);
  float seam = smoothstep(0.06, 0.0, min(e.x, e.y));
  float hole = step(max(e.x, e.y), 0.09);
  float weave = 0.5 + 0.5 * sin(P.x * 6.2832 / px * 2.0) * sin(P.y * 6.2832 / px * 2.0);
  vec3 fabric = u_paper * (1.0 - 0.06 * seam - 0.18 * hole - 0.03 * weave) * (1.0 - 0.025 * hash(cell));

  // thread colour: lightness steps with the hue kept, or a two-ink palette
  float lv = floor(2.0 + u_dither * 4.0);
  float Lq = floor(lum * lv + 0.5) / lv;
  vec3 q = clamp(c * (Lq / max(lum, 1e-3)), 0.0, 1.0);
  vec3 thread = u_keep > 0.5 ? q : mix(u_ink, u_mid, step(u_threshold * 0.55, lum));
  thread *= 1.0 - 0.05 * hash(cell + 1.1);
  if(u_iMode == 2) thread = mix(thread, u_paper, iFall(cuv) * u_iAmt * 0.3);

  float w = 0.11 + u_gap * 0.12;          // thread radius in cell units
  float aa = 0.9 / px;
  float inset = 0.12;
  vec2 a1 = vec2(inset, inset), b1 = vec2(1.0 - inset, 1.0 - inset);     // bottom thread: /
  vec2 a2 = vec2(inset, 1.0 - inset), b2 = vec2(1.0 - inset, inset);     // top thread, the other diagonal
  vec2 L = normalize(vec2(-0.6, 0.8));                                   // light from top-left
  vec2 shOff = vec2(0.05, -0.06);                                         // shadow falls down-right

  vec3 col = fabric;
  bool stitched = lum < u_threshold || u_keep > 0.5;
  if(stitched){
    // shadows of both threads on the fabric
    float sA = capsule(f - shOff, a1, b1), sB = capsule(f - shOff, a2, b2);
    float shadow = max(1.0 - smoothstep(w, w + 0.08, sA), 1.0 - smoothstep(w, w + 0.08, sB));
    col *= 1.0 - 0.28 * u_shade * shadow;
    // bottom thread
    float d1 = capsule(f, a1, b1);
    float m1 = 1.0 - smoothstep(w - aa, w + aa, d1);
    vec2 n1 = normalize(vec2(-1.0, 1.0));                                 // across-thread direction
    float t1 = clamp(dot(f - a1, n1) / w, -1.0, 1.0);
    float crown1 = sqrt(max(0.0, 1.0 - t1 * t1));
    float lit1 = 0.72 + 0.38 * crown1 * (0.6 + 0.4 * dot(n1 * sign(t1), L));
    lit1 += 0.18 * pow(crown1, 8.0) * u_shade;
    col = mix(col, thread * lit1, m1);
    // top thread casts onto the bottom one
    float sT = capsule(f - shOff, a2, b2);
    float shT = (1.0 - smoothstep(w, w + 0.07, sT)) * m1;
    col *= 1.0 - 0.3 * u_shade * shT;
    float d2 = capsule(f, a2, b2);
    float m2 = 1.0 - smoothstep(w - aa, w + aa, d2);
    vec2 n2 = normalize(vec2(1.0, 1.0));
    float t2 = clamp(dot(f - a2, n2) / w, -1.0, 1.0);
    float crown2 = sqrt(max(0.0, 1.0 - t2 * t2));
    float lit2 = 0.74 + 0.38 * crown2 * (0.6 + 0.4 * dot(n2 * sign(t2), L));
    lit2 += 0.2 * pow(crown2, 8.0) * u_shade;
    col = mix(col, thread * lit2 * 1.03, m2);
  }
  outColor = finish(col, vUv);
}
`;

/** Pixel split (pins 49, 35). Mode 0: part of the subject turns into flat pixels along
 * a straight boundary, the rest stays photographic. Mode 1: a blocky silhouette
 * cut-out, photo inside, paper outside. */
export const SPLIT_FRAG = HEADER + TECH + MASK + `
void main(){
  float px = max(u_pixel, 4.0);
  vec2 P = vUv * u_res;
  vec2 cell = floor(P / px);
  vec2 cuv = (cell + 0.5) * px / u_res;
  vec3 orig = texture(u_image, vUv).rgb;
  vec3 col = orig;
  if(u_shape == 1){
    // blocky cut-out: whole cells are in or out
    float inside = step(0.5, subjectAt(cuv));
    col = mix(u_paper, orig, inside);
    outColor = vec4(col, 1.0);
    return;
  }
  vec2 dir = vec2(cos(u_angle), sin(u_angle));
  float t = dot(cuv - 0.5, dir);
  float edge = (u_threshold - 0.5) * 1.4 + u_breathe * 0.08 * sin(u_phase * TAU);
  if(t < edge){
    vec3 c = texture(u_image, cuv).rgb;
    float lv = 2.0 + floor(u_dither * 8.0);
    float L = luma(c);
    float Lq = floor(L * lv + 0.5) / lv;
    if(u_dither > 0.02) c = clamp(c * (Lq / max(L, 1e-3)), 0.0, 1.0);
    col = c;
  }
  outColor = finish(col, vUv);
}
`;

/** Squircle blocks (pin 38): the subject becomes rounded blocks of several sizes with a
 * vertical gradient in each block, no shadows; outline-only echoes of the blocks sit in
 * the background. */
export const BLOCKS_FRAG = HEADER + TECH + MASK + `
float squircle(vec2 d, float r, float rad){
  vec2 q = abs(d) - (r - rad);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
void main(){
  float px = max(u_pixel, 6.0);
  vec2 g = vUv * u_res / px;
  vec3 orig = texture(u_image, vUv).rgb;
  vec3 col = u_bgMode > 0.5 ? u_paper : orig;
  float aa = 1.2 / px;
  // outline echoes: blocks offset into the background, drawn as thin rings
  vec2 echo = vec2(0.7, 0.45) * u_depth;
  for(int pass = 0; pass < 2; pass++){
    for(int j = -3; j <= 3; j++){
      for(int i = -3; i <= 3; i++){
        vec2 cell = floor(g) + vec2(float(i), float(j));
        vec2 macro = floor(cell / 3.0);
        float hs = hash(macro + 0.31);
        float size = hs < 0.35 ? 3.0 : (hs < 0.7 ? 2.0 : 1.0);
        vec2 origin = size > 2.5 ? macro * 3.0 : (size > 1.5 ? floor(cell / 2.0) * 2.0 : cell);
        if(cell.x != origin.x || cell.y != origin.y) continue;
        vec2 centre = (origin + size * 0.5) * px / u_res;
        if(subjectMask(centre) < 0.5) continue;
        vec2 c0 = origin + size * 0.5 + (pass == 0 ? echo : vec2(0.0));
        vec2 d = g - c0;
        float sd = squircle(d, size * 0.5, size * 0.22);
        if(pass == 0){
          if(u_depth < 0.5) continue;
          float ring = (1.0 - smoothstep(0.0, aa, abs(sd + 0.06))) ;
          col = mix(col, vec3(1.0), ring * 0.9 * (1.0 - subjectMask(vUv)));
        } else {
          float m = 1.0 - smoothstep(-aa, aa, sd);
          if(m <= 0.0) continue;
          vec3 c = texture(u_image, centre).rgb;
          float lv = 2.0 + floor(u_dither * 6.0);
          float L = luma(c);
          float Lq = floor(L * lv + 0.5) / lv;
          if(u_dither > 0.02) c = clamp(c * (Lq / max(L, 1e-3)), 0.0, 1.0);
          float v = (d.y / size) + 0.5;                                   // 0 bottom .. 1 top
          c *= mix(1.15, 0.72, clamp(v, 0.0, 1.0) * u_shade + (1.0 - u_shade) * 0.5);
          col = mix(col, c, m);
        }
      }
    }
  }
  outColor = vec4(col, 1.0);
}
`;

/** Glyph field (pin 39): a five-petal flower glyph where the subject is dark, a dot
 * where it is light. In trail mode the pointer paints flowers that fade back to dots. */
export const GLYPH_FRAG = HEADER + TECH + MASK + `
uniform sampler2D u_trail;
float flower(vec2 d, float r){
  float m = 1e9;
  for(int i = 0; i < 5; i++){
    float a = float(i) * 1.2566 + 0.3;
    m = min(m, length(d - vec2(cos(a), sin(a)) * r * 0.55) - r * 0.42);
  }
  return min(m, length(d) - r * 0.3);
}
void main(){
  float px = max(u_pixel, 6.0);
  vec2 P = vUv * u_res;
  vec2 cell = floor(P / px);
  vec2 f = fract(P / px) - 0.5;
  vec2 cuv = (cell + 0.5) * px / u_res;
  vec3 c = texture(u_image, cuv).rgb;
  float lum = luma(c);
  if(u_invert > 0.5) lum = 1.0 - lum;
  float dark = clamp((1.0 - lum - (u_threshold - 0.5)) * (0.6 + u_dither), 0.0, 1.0);
  float tr = texture(u_trail, cuv).r;
  float bloom = u_iMode == 4 ? smoothstep(0.05, 0.6, tr) : 0.0;
  float want = max(step(0.45, dark), bloom);
  float r = (0.3 + u_gap * 0.25) * (0.8 + 0.2 * hash(cell));
  float aa = 0.9 / px;
  float fl = 1.0 - smoothstep(-aa, aa, flower(f, r));
  float dot_ = 1.0 - smoothstep(r * 0.16 - aa, r * 0.16 + aa, length(f));
  float cov = mix(dot_ * step(0.08, dark + bloom), fl, want);
  vec3 paper = u_paper * (1.0 - 0.04 * hash(floor(P / max(1.0, u_res.y / 1080.0))));
  vec3 inkc = u_keep > 0.5 ? c : u_ink;
  // palette rotation per cell for the field look
  float hs = hash(cell + 2.2);
  if(u_keep < 0.5) inkc = hs < 0.33 ? u_ink : (hs < 0.66 ? u_mid : mix(u_ink, u_mid, 0.5));
  vec3 col = mix(paper, inkc, cov);
  // outside the subject the trail still paints flowers on the paper
  float m = subjectMask(vUv);
  vec3 bg = u_bgMode > 0.5 ? paper : texture(u_image, vUv).rgb;
  vec3 outside = mix(bg, inkc, fl * bloom);
  outColor = vec4(mix(outside, col, m), 1.0);
}
`;

/** Pointer trail accumulation: prev * decay + a soft splat at the pointer. */
export const TRAIL_FRAG = HEADER + `
uniform sampler2D u_prev;
uniform float u_decay;
uniform float u_add;
void main(){
  float prev = texture(u_prev, vUv).r * u_decay;
  float aspect = u_res.x / u_res.y;
  vec2 d = (vUv - u_mouse) * vec2(aspect, 1.0);
  float splat = exp(-dot(d, d) / (u_iRadius * u_iRadius * 0.08)) * u_add;
  outColor = vec4(vec3(clamp(prev + splat, 0.0, 1.0)), 1.0);
}
`;

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
