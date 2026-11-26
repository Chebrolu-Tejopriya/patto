// Pattern techniques derived from the user's Pinterest "patterns new" board.
// Each is a single fragment pass over the stylized image. They all share one
// uniform block (see TECH) so the renderer can upload the same Pattern params
// to every program; unused uniforms are simply optimised away.
//
// All animation is a function of u_phase through sin/cos or integer steps, so
// frame N of a loop lands exactly on frame 0.

export const HEADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_phase;
uniform vec2 u_mouse;
uniform float u_iAmt;
uniform float u_iRadius;
uniform int u_iMode;       // 0 orb, 1 warp, 2 light, 3 focus
#define TAU 6.28318530718
float iFall(vec2 uv){
  float aspect = u_res.x / u_res.y;
  vec2 d = (uv - u_mouse) * vec2(aspect, 1.0);
  return exp(-dot(d, d) / (u_iRadius * u_iRadius));
}
`;

export const TECH = `
uniform sampler2D u_image;
uniform float u_pixel;      // cell size in device px
uniform float u_threshold;
uniform float u_dither;
uniform float u_angle;      // radians
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform vec3 u_mid;
uniform float u_keep;       // 1 = keep image colour, 0 = ink/paper duotone
uniform float u_invert;
uniform float u_scroll;
uniform float u_depth;
uniform float u_tilt;       // radians
uniform float u_shade;
uniform float u_breathe;
uniform float u_gap;
uniform int u_shape;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
`;


/** Subject-mask helpers shared by every technique (alpha comes from the stylize pass). */
export const MASK = `
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}
`;

/** Halftone: dots on a rotated grid sized by tone. Shapes: dot, square (LED), diamond, ring. */
export const HALFTONE_FRAG = HEADER + TECH + `
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 2.0);
  vec2 P = vUv * u_res;
  vec2 R = rot(P - 0.5 * u_res, u_angle);
  vec2 cell = floor(R / px);
  vec2 f = fract(R / px) - 0.5;
  vec2 centre = rot((cell + 0.5) * px, -u_angle) + 0.5 * u_res;
  vec2 cuv = clamp(centre / u_res, 0.0, 1.0);
  vec3 c = texture(u_image, cuv).rgb;
  float lum = luma(c);
  if(u_invert > 0.5) lum = 1.0 - lum;
  float dark = 1.0 - lum;
  float v = clamp((dark - (u_threshold - 0.5)) * (0.5 + u_dither), 0.0, 1.0);
  v += u_breathe * 0.12 * sin(u_phase * TAU + hash(cell) * TAU);
  if(u_iMode == 3) v += iFall(cuv) * u_iAmt * 0.25;
  v = clamp(v, 0.0, 1.0);
  float r = sqrt(v) * 0.58 * (1.0 - u_gap * 0.6);
  float d;
  if(u_shape == 0) d = length(f);
  else if(u_shape == 1) d = max(abs(f.x), abs(f.y));
  else if(u_shape == 2) d = (abs(f.x) + abs(f.y)) * 0.7071;
  else d = abs(length(f) - r * 0.6) + r * 0.6;  // ring
  float aa = 0.9 / px;
  float m = 1.0 - smoothstep(r - aa, r + aa, d);
  vec3 dotc = u_keep > 0.5 ? c : u_ink;
  vec3 baseH = mix(u_paper, texture(u_image, vUv).rgb, u_shade);   // 'show photo' keeps the image under the dots (pin 42)
  outColor = finish(mix(baseH, dotc, m), vUv);
}
`;

/** ASCII: a procedural 5x7 glyph ramp " .:-=+*#%@" picked by tone. */
export const ASCII_FRAG = HEADER + TECH + `
const int G[70] = int[70](
  0,0,0,0,0,0,0,            // space
  0,0,0,0,0,12,12,          // .
  0,12,12,0,0,12,12,        // :
  0,0,0,31,0,0,0,           // -
  0,0,31,0,31,0,0,          // =
  0,4,4,31,4,4,0,           // +
  0,21,14,31,14,21,0,       // *
  10,31,10,10,31,10,0,      // #
  25,26,4,4,11,19,0,        // %
  14,17,23,21,23,16,14      // @
);
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 6.0);
  vec2 cs = vec2(px * 0.72, px);
  vec2 P = vUv * u_res;
  vec2 cell = floor(P / cs);
  vec2 f = fract(P / cs);
  vec2 cuv = (cell + 0.5) * cs / u_res;
  vec3 c = texture(u_image, cuv).rgb;
  float lum = luma(c);
  if(u_invert > 0.5) lum = 1.0 - lum;
  float dark = 1.0 - lum;
  float v = clamp((dark - (u_threshold - 0.5)) * (0.5 + u_dither), 0.0, 1.0);
  v += u_breathe * 0.1 * sin(u_phase * TAU + hash(cell) * TAU);
  if(u_iMode == 3) v += iFall(cuv) * u_iAmt * 0.3;
  int lvl = int(clamp(floor(clamp(v, 0.0, 1.0) * 9.999), 0.0, 9.0));
  // glyph box inside the cell, y flipped because rows are listed top to bottom
  vec2 g = (f - 0.5) * vec2(1.0 / 0.82, 1.0 / 0.86) + 0.5;
  float on = 0.0;
  if(g.x >= 0.0 && g.x < 1.0 && g.y >= 0.0 && g.y < 1.0){
    int gx = int(g.x * 5.0);
    int gy = int((1.0 - g.y) * 7.0);
    int row = G[lvl * 7 + gy];
    on = float((row >> (4 - gx)) & 1);
  }
  if(u_shape == 1){
    // typeset rows: word-like runs of small blocks with ascenders, in the image colour
    float seg = floor(cell.x / 5.0 + hash(vec2(cell.y, 7.0)) * 5.0);
    float inWord = step(fract((cell.x + hash(vec2(cell.y, 7.0)) * 5.0) / 5.0), 0.78);
    float asc = step(0.72, hash(vec2(cell.x, cell.y) + 0.5));
    float top = 0.62 + 0.3 * asc;
    float body = step(0.12, f.x) * step(f.x, 0.9) * step(0.2, f.y) * step(f.y, top);
    on = inWord * body * step(0.06, dark);
    float lv = 2.0 + floor(u_dither * 5.0);
    float L = luma(c);
    float Lq = floor(L * lv + 0.5) / lv;
    vec3 wc = u_keep > 0.5 ? clamp(c * (Lq / max(L, 1e-3)), 0.0, 1.0) : u_ink;
    wc *= 0.85 + 0.15 * hash(vec2(seg, cell.y));
    outColor = finish(mix(u_paper, wc, on), vUv);
    return;
  }
  vec3 inkc = u_keep > 0.5 ? c : u_ink;
  vec3 col = mix(u_paper, inkc, on);
  outColor = finish(col, vUv);
}
`;

/** Engrave: flow-field hatching. Strokes follow the image contours (direction
 * from a coarse Sobel), widen with tone and cross only in the shadows. The
 * direction is quantised to 8 bins and the two nearest bins are cross-faded,
 * so every bin is a globally continuous line field and strokes never tear. */
export const HATCH_FRAG = HEADER + TECH + `
float lumAt(vec2 uv){
  float l = luma(texture(u_image, clamp(uv, 0.0, 1.0)).rgb);
  return u_invert > 0.5 ? 1.0 - l : l;
}
// line field with normal n: spacing px, half width w (cell units)
float strokes(vec2 P, vec2 n, float px, float w, float seed){
  float s = dot(P, n) / px;
  float t = dot(P, vec2(-n.y, n.x)) / px;
  s += u_shade * 0.08 * sin(t * 0.6 + seed * 7.0);                 // hand wobble
  float line = floor(s);
  float fr = fract(s) - 0.5;
  float seg = floor(t / 4.0 + u_phase * u_scroll);                 // integer segments per loop: closes
  float dash = step(u_gap * 0.5, hash(vec2(seg, line + seed * 13.0)));
  float aa = 0.8 / px;
  return (1.0 - smoothstep(w - aa, w + aa, abs(fr))) * dash;
}
// Sobel at a coarse footprint, returned as a double-angle vector so opposite
// gradients do not cancel when interpolated. Length encodes confidence.
vec2 dirOf(float i){ float a = i * 0.39269908; return vec2(cos(a), sin(a)); } // pi/8 bins
vec2 orient(vec2 uv, float o, vec2 tx){
  float tl = lumAt(uv + vec2(-o,  o) * tx), tt = lumAt(uv + vec2(0.0,  o) * tx), tr = lumAt(uv + vec2(o,  o) * tx);
  float ll = lumAt(uv + vec2(-o, 0.0) * tx),                                     rr = lumAt(uv + vec2(o, 0.0) * tx);
  float bl = lumAt(uv + vec2(-o, -o) * tx), bb = lumAt(uv + vec2(0.0, -o) * tx), br = lumAt(uv + vec2(o, -o) * tx);
  vec2 g = vec2((tr + 2.0 * rr + br) - (tl + 2.0 * ll + bl), (tl + 2.0 * tt + tr) - (bl + 2.0 * bb + br));
  float m = length(g);
  if(m < 1e-5) return vec2(0.0);
  g /= m;
  return vec2(g.x * g.x - g.y * g.y, 2.0 * g.x * g.y) * smoothstep(0.08, 0.6, m);
}
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 3.0);
  vec2 P = vUv * u_res;
  vec2 tx = 1.0 / u_res;
  // direction field on a coarse grid (4 cells), bilinearly interpolated: smooth, no per-pixel noise
  float C = px * 6.0;
  vec2 gpos = P / C - 0.5;
  vec2 g0 = floor(gpos);
  vec2 gf = gpos - g0;
  vec2 d00 = orient((g0 + vec2(0.5, 0.5)) * C * tx, C * 0.75, tx);
  vec2 d10 = orient((g0 + vec2(1.5, 0.5)) * C * tx, C * 0.75, tx);
  vec2 d01 = orient((g0 + vec2(0.5, 1.5)) * C * tx, C * 0.75, tx);
  vec2 d11 = orient((g0 + vec2(1.5, 1.5)) * C * tx, C * 0.75, tx);
  vec2 d = mix(mix(d00, d10, gf.x), mix(d01, d11, gf.x), gf.y);
  float conf = length(d);
  float followAmt = (u_depth - 1.0) / 7.0;
  float follow = clamp(conf, 0.0, 1.0) * followAmt;
  float angG = conf > 1e-4 ? 0.5 * atan(d.y, d.x) : u_angle;
  // blend angles through double-angle vectors to avoid wrap-around
  vec2 vA = vec2(cos(2.0 * u_angle), sin(2.0 * u_angle));
  vec2 vG = vec2(cos(2.0 * angG), sin(2.0 * angG));
  vec2 v = mix(vA, vG, follow);
  float ang = 0.5 * atan(v.y, v.x);
  if(ang < 0.0) ang += 3.14159265;
  // quantise to 8 globally consistent line families and cross-fade the two nearest:
  // a continuously rotating field would self-interfere far from the origin
  float k = ang / 0.39269908;
  float i0 = floor(k);
  float wmix = smoothstep(0.0, 1.0, fract(k));
  vec2 n0 = dirOf(i0), n1 = dirOf(i0 + 1.0);

  if(u_shape == 2){
    // line art (pin 57): one-pixel outlines where the tone changes, broken into dashes,
    // and a sparse pixel dither only in the shadows. Everything else is bare paper.
    float s1 = max(1.0, u_res.y / 1080.0);
    vec2 t1 = tx * s1;
    float gx = lumAt(vUv + vec2(t1.x, 0.0)) - lumAt(vUv - vec2(t1.x, 0.0));
    float gy = lumAt(vUv + vec2(0.0, t1.y)) - lumAt(vUv - vec2(0.0, t1.y));
    float e = length(vec2(gx, gy)) * (0.5 + u_dither);
    float edge = step(0.12, e);
    float dash = step(u_gap * 0.7, hash(floor(P / (px * 1.5)) + 0.4));
    float darkL = clamp((1.0 - lumAt(vUv) - (u_threshold - 0.5)) * (0.6 + u_dither), 0.0, 1.0);
    // shadow pips on a whole-pixel grid (a fractional grid aliases into a moire)
    float g = max(2.0, floor(px * 0.45 + 0.5));
    vec2 gc = floor(P / g);
    vec2 fg = fract(P / g);
    float pip = step(fg.x, 0.5) * step(fg.y, 0.5) * step(hash(gc + 4.4), (darkL - 0.55) * 1.1);
    float ink = max(edge * dash, pip);
    vec3 cC = texture(u_image, vUv).rgb;
    vec3 inkL = u_keep > 0.5 ? cC * 0.6 : u_ink;
    outColor = finish(mix(u_paper, inkL, ink), vUv);
    return;
  }
  if(u_shape == 1){
    // linear dashes: one direction per region (nearest family, no blending), fixed dash
    // length and spacing, brick offset on alternate rows, constant width, no tone fill
    vec2 n = fract(k) < 0.5 ? n0 : n1;
    vec2 tdir = vec2(-n.y, n.x);
    float row = floor(dot(P, n) / px);
    float fr = fract(dot(P, n) / px) - 0.5;
    float along = dot(P, tdir) / px + (mod(row, 2.0) < 1.0 ? 0.0 : 1.7) + u_phase * u_scroll * 3.4;
    float seg = fract(along / 3.4);
    float dash = step(seg, 0.72);
    // tone density (u_shade): darker tone keeps more dashes, lighter tone drops them (pin 61)
    float lumD = lumAt(vUv);
    float darkD = clamp((1.0 - lumD - (u_threshold - 0.5)) * (0.6 + u_dither), 0.0, 1.0);
    dash *= step(hash(vec2(row, floor(along / 3.4)) + 0.9), mix(1.0, darkD * 1.5, u_shade));
    float capA = smoothstep(0.0, 0.08, seg) * (1.0 - smoothstep(0.64, 0.72, seg));
    float w = 0.14 + u_gap * 0.1;
    float line = (1.0 - smoothstep(w - 0.8 / px, w + 0.8 / px, abs(fr))) * dash * max(capA, 0.6);
    float lumC = lumAt(vUv);
    float darkC = clamp((1.0 - lumC - (u_threshold - 0.5)) * (0.6 + u_dither), 0.0, 1.0);
    line *= step(0.06, darkC);
    vec3 cC = texture(u_image, vUv).rgb;
    vec3 inkD = u_keep > 0.5 ? cC * 0.6 : u_ink;
    outColor = finish(mix(u_paper, inkD, line), vUv);
    return;
  }
  float cc = lumAt(vUv);
  float o = px;
  float tt = lumAt(vUv + vec2(0.0, o) * tx), bb = lumAt(vUv - vec2(0.0, o) * tx), ll = lumAt(vUv - vec2(o, 0.0) * tx), rr = lumAt(vUv + vec2(o, 0.0) * tx);
  float lum = (cc * 4.0 + tt + bb + ll + rr) / 8.0;
  float dark = clamp((1.0 - lum - (u_threshold - 0.5)) * (0.6 + u_dither), 0.0, 1.0);
  dark = pow(dark, 1.35);                                     // keep the mids open like a real plate
  if(u_iMode == 2) dark *= 1.0 - iFall(vUv) * u_iAmt * 0.5;
  float w1 = dark < 0.04 ? 0.0 : 0.05 + dark * 0.42;
  float ink = mix(strokes(P, n0, px, w1, 1.0), strokes(P, n1, px, w1, 1.0), wmix);
  if(dark > 0.6){
    float w2 = (dark - 0.6) / 0.4 * 0.36;
    vec2 p0 = vec2(-n0.y, n0.x), p1 = vec2(-n1.y, n1.x);
    ink = max(ink, mix(strokes(P, p0, px * 0.9, w2, 2.0), strokes(P, p1, px * 0.9, w2, 2.0), wmix));
  }
  vec3 c = texture(u_image, vUv).rgb;
  vec3 inkc = u_keep > 0.5 ? c * 0.5 : u_ink;
  vec3 paper = u_paper * (1.0 - 0.03 * hash(floor(P / max(1.0, u_res.y / 1080.0))));
  outColor = finish(mix(paper, inkc, ink), vUv);
}
`;

/** Riso: spot-ink plates printed with misregistration on textured paper. */
export const RISO_FRAG = HEADER + TECH + `
float lumAt(vec2 uv){
  float l = luma(texture(u_image, clamp(uv, 0.0, 1.0)).rgb);
  return u_invert > 0.5 ? 1.0 - l : l;
}
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  vec2 P = vUv * u_res;
  float s = max(1.0, u_res.y / 1080.0);
  vec2 tx = 1.0 / u_res;
  float reg = u_gap * 8.0 * s;
  float wob = 1.0 + u_breathe * 0.5 * sin(u_phase * TAU);
  vec2 d1 = vec2( 0.8,  0.5) * reg * wob;
  vec2 d2 = vec2(-0.6,  0.9) * reg * wob;
  vec2 d3 = vec2( 0.3, -1.0) * reg * wob;
  if(u_iMode == 1){ vec2 push = (u_mouse - vUv) * iFall(vUv) * u_iAmt * 6.0 * s; d1 += push; d2 -= push * 0.6; }
  float fibre = hash(floor(P / s));
  float fibre2 = hash(floor(P / (3.0 * s)) + 7.0);
  vec3 paper = u_paper * (1.0 - 0.05 * fibre - 0.03 * fibre2);
  float cov1 = 0.82 + 0.18 * hash(floor(P / (2.0 * s)) + 3.0);
  float cov2 = 0.82 + 0.18 * hash(floor(P / (2.0 * s)) + 5.0);
  float dens = mix(0.6, 1.0, u_shade);
  float soft = 0.02 + u_dither * 0.15;
  vec3 col = paper;
  if(u_keep > 0.5){
    // colour riso: each channel comes from its own misregistered plate, quantised to a few levels
    float lv = 2.0 + floor(u_depth);
    float r = floor(texture(u_image, clamp(vUv + d1 * tx, 0.0, 1.0)).r * lv + 0.5) / lv;
    float g = floor(texture(u_image, clamp(vUv + d2 * tx, 0.0, 1.0)).g * lv + 0.5) / lv;
    float b = floor(texture(u_image, clamp(vUv + d3 * tx, 0.0, 1.0)).b * lv + 0.5) / lv;
    vec3 ink = vec3(r, g, b);
    if(u_invert > 0.5) ink = 1.0 - ink;
    col = paper * mix(vec3(1.0), ink, cov1 * dens);
  } else if(u_shape == 1){
    // line raster (pin 71): shadows solid in the ink, mids as a diagonal line screen in the
    // second ink, one-pixel outline at the tone edges. Hard pixels, no softness.
    float l1 = lumAt(vUv + d1 * tx);
    float l2 = lumAt(vUv + d2 * tx);
    float sp = max(3.0, 4.0 * s);
    float diag = step(0.5, fract((P.x + P.y) / (sp * 1.4142)));
    float solid = 1.0 - step(u_threshold, l1);
    float mids = (1.0 - step(u_threshold + 0.3, l2)) * (1.0 - solid);
    float gx = lumAt(vUv + vec2(tx.x * s, 0.0)) - lumAt(vUv - vec2(tx.x * s, 0.0));
    float gy = lumAt(vUv + vec2(0.0, tx.y * s)) - lumAt(vUv - vec2(0.0, tx.y * s));
    float edge = step(0.22, length(vec2(gx, gy)) * (0.6 + u_dither));
    col = mix(col, col * u_mid, mids * diag * dens);
    col = mix(col, col * u_ink, max(solid, edge) * dens);
  } else {
    float l1 = lumAt(vUv + d1 * tx);
    float l2 = lumAt(vUv + d2 * tx);
    float a1 = 1.0 - smoothstep(u_threshold - soft, u_threshold + soft, l1);                 // ink plate: shadows
    float a2 = 1.0 - smoothstep(u_threshold + 0.3 - soft, u_threshold + 0.3 + soft, l2);     // second plate: shadows + mids
    col = mix(col, col * u_mid, a2 * cov2 * dens);
    col = mix(col, col * u_ink, a1 * cov1 * dens);
  }
  outColor = finish(col, vUv);
}
`;

/** Paper cut: tone sliced into flat card layers with a soft drop shadow between them. */
export const PAPERCUT_FRAG = HEADER + TECH + `
float lumAt(vec2 uv){
  float l = luma(texture(u_image, clamp(uv, 0.0, 1.0)).rgb);
  l = clamp(l + (0.5 - u_threshold) * 0.8, 0.0, 1.0);
  return u_invert > 0.5 ? 1.0 - l : l;
}
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  vec2 P = vUv * u_res;
  float s = max(1.0, u_res.y / 1080.0);
  vec2 tx = 1.0 / u_res;
  float L = floor(u_depth) + 1.0;                 // layers
  float lum = lumAt(vUv);
  float layer = floor(lum * L * 0.999);
  vec2 ldir = vec2(cos(u_angle), sin(u_angle));   // light comes from this direction
  if(u_iMode == 2){ vec2 toM = (u_mouse - vUv) * vec2(u_res.x / u_res.y, 1.0); ldir = normalize(mix(ldir, normalize(toM + 1e-4), u_iAmt * 0.6)); }
  float reach = (2.0 + u_gap * 26.0) * s * (1.0 + u_breathe * 0.3 * sin(u_phase * TAU));
  float sh = 0.0;
  for(int i = 1; i <= 8; i++){
    float t = float(i) / 8.0;
    float lq = floor(lumAt(vUv + ldir * reach * t * tx) * L * 0.999);
    if(lq > layer) sh = max(sh, 1.0 - t);
  }
  sh = smoothstep(0.0, 1.0, sh) * u_shade;
  vec3 col;
  if(u_keep > 0.5){
    vec3 c = texture(u_image, vUv).rgb;
    float lc = max(luma(c), 0.03);
    col = clamp(c * ((layer + 0.5) / L) / lc, 0.0, 1.0);
  } else {
    float t = (layer + 0.5) / L;
    col = t < 0.5 ? mix(u_ink, u_mid, t * 2.0) : mix(u_mid, u_paper, t * 2.0 - 1.0);
  }
  col *= 1.0 - 0.035 * hash(floor(P / s));
  col *= 1.0 - sh * 0.55;
  float lq2 = floor(lumAt(vUv - ldir * 1.6 * s * tx) * L * 0.999);
  if(lq2 < layer) col = mix(col, vec3(1.0), 0.12 * u_shade);   // lit cut edge
  outColor = finish(col, vUv);
}
`;

/** Print: process-colour halftone screens (C 15, M 75, Y 0, K 45 degrees) with dot gain
 * and misregistration. Image colours off = a single key-ink screen. */
export const PRINT_FRAG = HEADER + TECH + `
float screenDot(vec2 P, float ang, float px, float v){
  vec2 R = rot(P, ang);
  vec2 f = fract(R / px) - 0.5;
  float r = sqrt(clamp(v, 0.0, 1.0)) * 0.62;
  float aa = 0.9 / px;
  return 1.0 - smoothstep(r - aa, r + aa, length(f));
}
float tone(float v){
  v = clamp((v - (u_threshold - 0.5)), 0.0, 1.0);
  return clamp(v * (1.0 + u_dither * 0.5) + u_dither * 0.05 * step(0.02, v), 0.0, 1.0);   // dot gain
}
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 3.0);
  vec2 P = vUv * u_res;
  float s = max(1.0, u_res.y / 1080.0);
  vec2 tx = 1.0 / u_res;
  float reg = u_gap * 6.0 * s * (1.0 + u_breathe * 0.4 * sin(u_phase * TAU));
  vec3 paper = u_paper * (1.0 - 0.03 * hash(floor(P / s)));
  vec3 col = paper;
  float pulse = 1.0 + u_breathe * 0.08 * sin(u_phase * TAU);
  if(u_iMode == 3) pulse += iFall(vUv) * u_iAmt * 0.3;
  if(u_keep > 0.5){
    vec3 cC = texture(u_image, clamp(vUv + vec2( 0.7,  0.4) * reg * tx, 0.0, 1.0)).rgb;
    vec3 cM = texture(u_image, clamp(vUv + vec2(-0.5,  0.8) * reg * tx, 0.0, 1.0)).rgb;
    vec3 cY = texture(u_image, clamp(vUv + vec2( 0.3, -0.9) * reg * tx, 0.0, 1.0)).rgb;
    vec3 cK = texture(u_image, vUv).rgb;
    if(u_invert > 0.5){ cC = 1.0 - cC; cM = 1.0 - cM; cY = 1.0 - cY; cK = 1.0 - cK; }
    float k = min(1.0 - cK.r, min(1.0 - cK.g, 1.0 - cK.b)) * u_shade;
    float c = (1.0 - cC.r - k) / max(1e-3, 1.0 - k);
    float m = (1.0 - cM.g - k) / max(1e-3, 1.0 - k);
    float y = (1.0 - cY.b - k) / max(1e-3, 1.0 - k);
    float C = screenDot(P, u_angle + 0.2618, px, tone(c) * pulse);
    float M = screenDot(P, u_angle + 1.3090, px, tone(m) * pulse);
    float Y = screenDot(P, u_angle,          px, tone(y) * pulse);
    float K = screenDot(P, u_angle + 0.7854, px, tone(k) * pulse);
    col *= mix(vec3(1.0), vec3(0.0, 0.62, 0.89), C);
    col *= mix(vec3(1.0), vec3(0.93, 0.0, 0.55), M);
    col *= mix(vec3(1.0), vec3(1.0, 0.92, 0.0), Y);
    col *= mix(vec3(1.0), u_ink, K);
  } else {
    float l = luma(texture(u_image, vUv).rgb);
    if(u_invert > 0.5) l = 1.0 - l;
    float K = screenDot(P, u_angle + 0.7854, px, tone(1.0 - l) * pulse);
    col *= mix(vec3(1.0), u_ink, K);
  }
  outColor = finish(col, vUv);
}
`;

/** Glitch: banded slips, block corruption, chroma split and scanlines. States step
 * an integer number of times per loop so the sequence repeats exactly. */
export const GLITCH_FRAG = HEADER + TECH + `
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float N = 12.0;
  float st = mod(floor(u_phase * N), N);
  float px = max(u_pixel, 2.0);
  vec2 P = vUv * u_res;
  vec2 uv = vUv;
  float band = floor(P.y / (px * 6.0));
  float h = hash(vec2(band, st));
  float amt = u_threshold;
  vec2 off = vec2(0.0);
  if(h < amt * 0.5) off.x = (hash(vec2(band + 7.0, st)) - 0.5) * u_dither * 0.25;
  // smooth sine wobble (2 cycles per loop) so it also moves between states
  off.x += u_breathe * 0.01 * sin(P.y / px * 0.3 + u_phase * TAU * 2.0);
  if(u_iMode == 1) off += (u_mouse - 0.5) * iFall(vUv) * u_iAmt * 0.08;
  // block corruption: a few big blocks go chunky and slide
  vec2 blk = floor(P / (px * 12.0));
  float hb = hash(blk + st * 0.37);
  if(hb < amt * 0.15){
    uv = floor(uv * u_res / (px * 2.0)) * (px * 2.0) / u_res;
    off += (vec2(hash(blk + 1.3), hash(blk + 2.7)) - 0.5) * 0.3 * u_dither;
  }
  vec2 suv = clamp(uv + off, 0.0, 1.0);
  float split = u_shade * 0.02 * (0.3 + 0.7 * h);
  float r = texture(u_image, clamp(suv + vec2(split, 0.0), 0.0, 1.0)).r;
  float g = texture(u_image, suv).g;
  float b = texture(u_image, clamp(suv - vec2(split, 0.0), 0.0, 1.0)).b;
  vec3 col = vec3(r, g, b);
  // accent bars in the mid colour, negative flashes when inverted
  if(h > 1.0 - amt * 0.06) col = mix(col, u_mid, 0.85);
  if(u_invert > 0.5 && h > 0.5 && h < 0.5 + amt * 0.08) col = 1.0 - col;
  // scanlines
  col *= 1.0 - u_gap * 0.35 * step(0.5, fract(P.y * 0.5));
  outColor = finish(col, vUv);
}
`;

/** Mosaic shards: bevelled pixel tiles; a fraction of tiles drift out of the grid. */
export const MOSAIC_FRAG = HEADER + TECH + `
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 4.0);
  vec2 cells = u_res / px;
  vec2 pc = vUv * u_res / px;
  vec2 own = floor(pc);
  vec3 col = u_paper;
  float best = -1.0;
  for(int j = -2; j <= 2; j++){
    for(int i = -2; i <= 2; i++){
      vec2 c = own + vec2(float(i), float(j));
      if(c.x < 0.0 || c.y < 0.0 || c.x >= cells.x || c.y >= cells.y) continue;
      vec2 cuv = (c + 0.5) / cells;
      vec3 s = texture(u_image, cuv).rgb;
      float lum = luma(s);
      if(u_invert > 0.5) lum = 1.0 - lum;
      if(lum < u_threshold) continue;             // background cells stay empty
      float hs = hash(c);
      bool pop = hs < u_gap;
      if(pop){
        // only tiles on the silhouette edge break away
        float lN = luma(texture(u_image, cuv + vec2(0.0, 1.0 / cells.y)).rgb);
        float lS = luma(texture(u_image, cuv - vec2(0.0, 1.0 / cells.y)).rgb);
        float lE = luma(texture(u_image, cuv + vec2(1.0 / cells.x, 0.0)).rgb);
        float lW = luma(texture(u_image, cuv - vec2(1.0 / cells.x, 0.0)).rgb);
        if(u_invert > 0.5){ lN = 1.0 - lN; lS = 1.0 - lS; lE = 1.0 - lE; lW = 1.0 - lW; }
        float edge = step(min(min(lN, lS), min(lE, lW)), u_threshold);
        pop = edge > 0.5;
      }
      vec2 dir = normalize(vec2(hash(c + 1.7), hash(c + 3.1)) - 0.5 + 1e-3);
      float mag = pop ? u_depth * 0.5 * (0.5 + 0.5 * hash(c + 5.3)) : 0.0;
      mag *= 1.0 + u_breathe * 0.4 * sin(u_phase * TAU + hs * TAU);
      if(u_iMode == 3 && pop) mag += iFall(cuv) * u_iAmt * 1.5;
      float scale = pop ? 0.78 : 1.0;
      vec2 f = pc - (c + dir * mag);
      if(f.x < 0.0 || f.y < 0.0 || f.x >= scale || f.y >= scale) continue;
      float z = pop ? 1.0 + mag : 0.0;
      if(z <= best) continue;
      best = z;
      vec2 ff = f / scale;
      float bev = u_shade * 0.28;
      vec3 sc = u_keep > 0.5 ? s : mix(u_ink, u_paper, lum);
      sc *= 1.0 + bev * (1.0 - smoothstep(0.0, 0.16, min(1.0 - ff.y, ff.x)));  // lit top/left edge
      sc *= 1.0 - bev * (1.0 - smoothstep(0.0, 0.16, min(ff.y, 1.0 - ff.x)));  // shaded bottom/right
      float gr = 1.0 - smoothstep(0.0, 0.035, min(min(ff.x, 1.0 - ff.x), min(ff.y, 1.0 - ff.y)));
      sc = mix(sc, sc * 0.72, gr * u_shade);
      col = sc;
    }
  }
  outColor = finish(col, vUv);
}
`;

/** Paper mosaic (board pin 0): irregular translucent tiles over the thick parts of
 * the subject only. Tiles vary in size (2x2 or 1x1), sit slightly off-grid, overlap
 * and are quantised to a few colours. Thin features and the background are left as
 * they are; a soft sepia copy of the subject is offset beneath as a shadow. */
export const TILES_FRAG = HEADER + TECH + MASK + `
void main(){
  float px = max(u_pixel, 4.0);
  vec2 g = vUv * u_res / px;
  vec3 base = texture(u_image, vUv).rgb;
  vec3 col = u_bgMode > 0.5 ? u_paper : base;
  // soft shadow copy of the subject, offset by u_depth cells along u_tilt
  if(u_depth > 0.5){
    vec2 off = vec2(cos(u_tilt), sin(u_tilt)) * u_depth * px / u_res;
    float sh = 0.0;
    for(int i = 0; i < 5; i++){
      float a = float(i) * 1.2566;
      vec2 o = i == 0 ? vec2(0.0) : vec2(cos(a), sin(a)) * px * 0.8 / u_res;
      sh += subjectMask(vUv - off + o);
    }
    sh /= 5.0;
    col = mix(col, col * vec3(0.80, 0.72, 0.58), sh * 0.55);
  }
  for(int j = -2; j <= 2; j++){
    for(int i = -2; i <= 2; i++){
      vec2 cell = floor(g) + vec2(float(i), float(j));
      vec2 macro = floor(cell * 0.5);
      bool split = hash(macro + 0.13) < u_gap;
      vec2 origin = split ? cell : macro * 2.0;
      float size = split ? 1.0 : 2.0;
      if(!split && (cell.x != origin.x || cell.y != origin.y)) continue;   // one pass per big tile
      float sc = 0.82 + 0.4 * hash(origin + 5.3);
      vec2 jit = (vec2(hash(origin + 1.7), hash(origin + 3.1)) - 0.5) * 0.5 * u_shade;
      vec2 lo = origin + jit + size * 0.5 * (1.0 - sc);
      vec2 hi = lo + size * sc;
      if(g.x < lo.x || g.y < lo.y || g.x >= hi.x || g.y >= hi.y) continue;
      vec2 centre = (origin + size * 0.5) * px / u_res;
      if(subjectMask(centre) < 0.5) continue;                                // only on the thick subject
      vec3 c = texture(u_image, centre).rgb;
      // quantise lightness only so the hue of each tile stays true (per-channel steps turn tans into greens)
      float lv = 2.0 + floor(u_dither * 6.0);
      float L = luma(c);
      float Lq = floor(L * lv + 0.5) / lv;
      c = clamp(c * (Lq / max(L, 1e-3)), 0.0, 1.0);
      c *= 1.0 + u_breathe * 0.05 * sin(u_phase * TAU + hash(origin) * TAU);
      float a = 0.55 + 0.4 * hash(origin + 7.7);                              // translucent like watercolour tiles
      col = mix(col, c, a);
    }
  }
  outColor = vec4(col, 1.0);
}
`;

/** Soft / airbrush: separable Gaussian blur (two passes) with bloom and a soft mix
 * back toward the sharp image. u_pass 0 = horizontal, 1 = vertical + combine. */
export const SOFT_FRAG = HEADER + TECH + `
uniform sampler2D u_orig;
uniform vec2 u_dir;        // texel step for this pass
uniform int u_pass;
// ---- subject mask (alpha written by the stylize pass) ----
uniform float u_thin;      // px: features thinner than this keep the original
uniform float u_bgMode;    // 0 keep the original background, 1 flat paper colour
float subjectAt(vec2 uv){ return texture(u_image, clamp(uv, 0.0, 1.0)).a; }
float subjectMask(vec2 uv){
  float m = subjectAt(uv);
  if(u_thin <= 0.0) return m;
  vec2 tx = u_thin / u_res;
  float t = m;
  for(int i = 0; i < 8; i++){
    float a = float(i) * 0.785398;
    t = min(t, subjectAt(uv + vec2(cos(a), sin(a)) * tx));
  }
  return t;
}
vec4 finish(vec3 col, vec2 uv){
  float m = subjectMask(uv);
  vec3 bg = u_bgMode > 0.5 ? u_paper : texture(u_image, uv).rgb;
  return vec4(mix(bg, col, m), 1.0);
}

void main(){
  float px = max(u_pixel, 1.0);
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  vec2 tileOff = vec2(0.0);
  float tilePx = u_depth * 14.0 * max(1.0, u_res.y / 1080.0);
  if(u_shape == 1 && u_pass == 1){
    vec2 tcell = floor(vUv * u_res / tilePx);
    tileOff = (vec2(hash(tcell + 1.3), hash(tcell + 4.7)) - 0.5) * tilePx * 0.35 / u_res;   // refraction
  }
  for(int i = -14; i <= 14; i++){
    float t = float(i) / 14.0;
    float w = exp(-t * t * 3.2);
    acc += texture(u_image, clamp(vUv + tileOff + u_dir * t * px, 0.0, 1.0)) * w;
    wsum += w;
  }
  vec3 blur = acc.rgb / wsum;
  float halo = acc.a / wsum;
  if(u_pass == 0){ outColor = vec4(blur, halo); return; }
  vec3 orig = texture(u_orig, vUv).rgb;
  if(u_shape == 1){
    // frosted glass tiles over the subject, a glow halo beyond them, flat wash behind
    vec2 tf = fract(vUv * u_res / tilePx);
    vec2 te = min(tf, 1.0 - tf);
    float edge = 1.0 - smoothstep(0.0, 0.07, min(te.x, te.y));
    float sheen = 0.06 * (tf.y - 0.5);
    vec3 glass = clamp(blur * (1.0 + sheen) + edge * 0.16 + 0.04, 0.0, 1.0);
    float m = subjectMask(vUv);
    float tileOn = step(0.35, subjectMask(floor(vUv * u_res / tilePx) * tilePx / u_res + tilePx * 0.5 / u_res));
    vec3 wash = mix(u_paper, u_paper * 0.92 + 0.08, vUv.y);
    vec3 glow = mix(wash, blur, clamp(halo * 0.9, 0.0, 1.0) * u_gap);
    vec3 res = mix(glow, glass, max(m, tileOn * step(0.08, halo)));
    float lvG = 2.0 + floor(u_dither * 10.0);
    if(u_dither > 0.02) res = mix(res, floor(res * lvG + 0.5) / lvG, 0.35);
    outColor = vec4(res, 1.0);
    return;
  }
  float mixAmt = u_shade;
  if(u_iMode == 2) mixAmt *= 1.0 - iFall(vUv) * u_iAmt * 0.6;  // the pointer brings focus back
  vec3 col = mix(orig, blur, mixAmt);
  col += blur * blur * (u_depth / 8.0) * 0.6;                   // bloom from bright areas
  // gentle posterisation gives the airbrushed bands in the references
  float lv = 2.0 + floor(u_dither * 10.0);
  if(u_dither > 0.02) col = mix(col, floor(col * lv + 0.5) / lv, 0.5);
  col = mix(col, u_paper, u_gap * 0.6);                             // flat wash
  col = (col - 0.5) * (1.0 + u_gap * 0.35) + 0.5;
  float breathe = 1.0 + u_breathe * 0.06 * sin(u_phase * TAU);
  vec3 bgc = u_bgMode > 0.5 ? u_paper : orig;
  outColor = vec4(mix(bgc, clamp(col * breathe, 0.0, 1.0), subjectMask(vUv)), 1.0);
}
`;

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
