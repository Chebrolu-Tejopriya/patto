// GLSL sources. Every pass is a fragment shader over a full-screen quad.
// Animation is driven by u_phase in [0,1): one full loop. Shaders only use
// u_phase through sin/cos of 2*pi*phase (or integer multiples), so frame 0 and
// frame N are identical and the loop closes exactly.

const HEADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_phase;
uniform vec2 u_mouse;      // 0..1, y up
uniform float u_iAmt;      // interaction strength * presence (0 = off)
uniform float u_iRadius;   // relative to frame height
uniform int u_iMode;       // 0 orb, 1 warp, 2 light, 3 focus
#define TAU 6.28318530718
float iFall(vec2 uv){
  float aspect = u_res.x / u_res.y;
  vec2 d = (uv - u_mouse) * vec2(aspect, 1.0);
  return exp(-dot(d, d) / (u_iRadius * u_iRadius));
}
`;

const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
// 3D-ish fbm: 2D position plus a looping offset travelling on a circle.
float fbm(vec2 p, vec2 orbit){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){
    v+=a*snoise(p+orbit*float(i+1)*0.37);
    p=p*2.03+vec2(17.1,9.3);
    a*=0.5;
  }
  return v;
}
`;

const RAMP = `
uniform int u_stopCount;
uniform vec3 u_colors[8];
uniform float u_positions[8];
vec3 ramp(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = u_colors[0];
  for(int i=1;i<8;i++){
    if(i>=u_stopCount) break;
    float a = u_positions[i-1], b = u_positions[i];
    float k = smoothstep(a, b, t);
    c = mix(c, u_colors[i], k);
  }
  return c;
}
`;

export const GRADIENT_FRAG = HEADER + NOISE + RAMP + `
uniform int u_type;        // 0 linear, 1 radial, 2 mesh
uniform float u_angle;     // radians
uniform float u_warp;
uniform float u_scale;
uniform float u_flow;
uniform float u_seed;

void main(){
  vec2 uv = vUv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // Orbit in noise space: closed loop, radius scales with flow.
  vec2 orbit = vec2(cos(u_phase*TAU), sin(u_phase*TAU)) * u_flow * 0.6 + u_seed * 10.0;

  // Cursor warp, kept soft: the whole field drifts toward the pointer (like a
  // parallax origin shift) and a wide, mild swirl bends it locally.
  if(u_iMode == 1 && u_iAmt > 0.0){
    vec2 mp = vec2((u_mouse.x - 0.5) * aspect, u_mouse.y - 0.5);
    p -= mp * u_iAmt * 0.25;                       // global drift
    vec2 d = p - mp;
    float fall = exp(-dot(d, d) / (u_iRadius * u_iRadius));
    float ang = fall * u_iAmt * 0.6;               // gentle local bend
    float cs = cos(ang), sn = sin(ang);
    p = mp + vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
  }

  // Domain warp: push p by two noise fields.
  vec2 q = p * u_scale;
  float n1 = fbm(q, orbit);
  float n2 = fbm(q + vec2(5.2, 1.3), orbit);
  vec2 warped = p + u_warp * 0.5 * vec2(n1, n2);

  float t;
  if(u_type == 0){
    vec2 dir = vec2(cos(u_angle), sin(u_angle));
    t = dot(warped, dir) / (0.5 * (abs(dir.x)*aspect + abs(dir.y))) * 0.5 + 0.5;
  } else if(u_type == 1){
    t = length(warped) / (0.5 * max(aspect, 1.0)) ;
  } else {
    // mesh: blend of a soft radial and the noise field itself
    float n3 = fbm(warped * u_scale * 0.7 + vec2(2.7, 8.1), orbit);
    t = 0.5 + 0.5 * n3 + 0.15 * (warped.y);
  }
  vec3 col = ramp(t);
  outColor = vec4(col, 1.0);
}
`;

// Restyles an uploaded photo into the look: gradient-map its luminance through
// the ramp, posterize, fog it with the animated gradient, add an orb and a
// vignette. Runs even without a photo so the orb and vignette work on plain
// gradients too.
export const STYLIZE_FRAG = HEADER + RAMP + `
uniform sampler2D u_grad;
uniform sampler2D u_photo;
uniform vec2 u_photoSize;
uniform float u_hasPhoto;
uniform vec3 u_bg;          // estimated background colour of the photo
uniform float u_bgTol;      // colour distance that counts as subject
uniform float u_subject;    // 1 = write a subject mask into alpha
uniform float u_photoFlip;  // 1 when the browser ignored UNPACK_FLIP_Y for ImageBitmap uploads
uniform int u_fit;          // 0 cover, 1 contain
uniform float u_blend;
uniform float u_posterize;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_haze;
uniform float u_hazeHeight;
uniform float u_vignette;
uniform float u_orbOn;
uniform vec2 u_orbPos;
uniform float u_orbRadius;
uniform float u_orbSoft;
uniform float u_orbColorPos;
uniform float u_orbGlow;

void main(){
  vec2 uv = vUv;
  float aspect = u_res.x / u_res.y;
  vec3 grad = texture(u_grad, uv).rgb;
  vec3 col = grad;
  float mask = 1.0;

  if(u_hasPhoto > 0.5){
    if(u_subject > 0.5) mask = 0.0;
    vec2 sc = u_res / u_photoSize;
    float s = (u_fit == 0) ? max(sc.x, sc.y) : min(sc.x, sc.y);
    vec2 drawn = u_photoSize * s;
    vec2 off = (u_res - drawn) * 0.5;
    vec2 puv = (uv * u_res - off) / drawn;
    bool inside = all(greaterThanEqual(puv, vec2(0.0))) && all(lessThanEqual(puv, vec2(1.0)));
    if(inside){
      vec3 photo = texture(u_photo, vec2(puv.x, u_photoFlip > 0.5 ? 1.0 - puv.y : puv.y)).rgb;
      if(u_subject > 0.5) mask = smoothstep(u_bgTol * 0.6, u_bgTol * 1.4, length(photo - u_bg));
      float lum = dot(photo, vec3(0.299, 0.587, 0.114));
      lum = (lum - 0.5) * u_contrast + 0.5 + u_exposure;
      if(u_posterize > 0.5){
        float n = max(u_posterize, 2.0);
        lum = floor(clamp(lum, 0.0, 0.9999) * n) / (n - 1.0);
      }
      vec3 mapped = ramp(lum);
      // keep a little of the photo's own hue so subjects stay readable
      vec3 graded = mix(photo, mapped, u_blend);
      // fog: the animated gradient rolls in from the top of the frame
      float fog = smoothstep(1.0 - u_hazeHeight, 1.0, uv.y);
      float fogAmt = u_haze * (0.25 + 0.75 * fog);
      col = mix(graded, grad, fogAmt);
    }
  }

  // orb: a soft disc + glow, coloured from the ramp
  if(u_orbOn > 0.5){
    vec2 d2 = (uv - u_orbPos) * vec2(aspect, 1.0);
    float d = length(d2);
    float disc = 1.0 - smoothstep(u_orbRadius - u_orbSoft, u_orbRadius + u_orbSoft, d);
    float glow = exp(-max(d - u_orbRadius, 0.0) / max(u_orbRadius, 0.001) * 3.0) * u_orbGlow;
    vec3 oc = ramp(u_orbColorPos);
    col = mix(col, oc, disc);
    col += oc * glow * (1.0 - disc);
  }

  // cursor light: a soft lamp in the ramp's brightest colour
  if(u_iMode == 2 && u_iAmt > 0.0){
    float g = iFall(uv);
    col = mix(col, ramp(0.95), g * u_iAmt * 0.45); // blend toward the light colour rather than adding hard glow
  }

  // vignette
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - u_vignette * smoothstep(0.35, 1.1, length(p));

  outColor = vec4(clamp(col, 0.0, 1.0), mask);
}
`;

// 1-bit / few-colour bitmap: pixelate, ordered dither, map to ink & paper.
// Mirrors the hand-made pixel-art look: chunky cells, Bayer or line raster.
export const BITMAP_FRAG = HEADER + `
uniform sampler2D u_image;
uniform float u_pixel;      // cell size in device px
uniform float u_threshold;
uniform float u_dither;
uniform int u_mode;         // 0 bayer4, 1 bayer8, 2 lines, 3 noise
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform vec3 u_mid;
uniform float u_midtone;
uniform float u_scroll;     // cells per loop
uniform float u_invert;

const int B4[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);
const int B8[64] = int[64](
  0,32,8,40,2,34,10,42, 48,16,56,24,50,18,58,26, 12,44,4,36,14,46,6,38, 60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41, 51,19,59,27,49,17,57,25, 15,47,7,39,13,45,5,37, 63,31,55,23,61,29,53,21);

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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
  float px = max(u_pixel, 1.0);
  vec2 suv = vUv;
  if(u_iMode == 3 && u_iAmt > 0.0){
    float f = iFall(vUv) * u_iAmt;
    // halve the cell size in up to two discrete steps; whole-pixel sizes avoid moiré rings
    float steps = floor(f * 2.0 + 0.5);
    px = max(1.0, floor(px / pow(2.0, steps) + 0.5));
    suv = mix(vUv, u_mouse + (vUv - u_mouse) * 0.92, f); // barely-there magnifier
  }
  vec2 cell = floor(suv * u_res / px);
  vec2 cuv = (cell + 0.5) * px / u_res;           // sample at cell centre
  vec3 c = texture(u_image, cuv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  if(u_invert > 0.5) lum = 1.0 - lum;

  // scroll the matrix an integer number of cells over the loop so it still closes
  ivec2 ic = ivec2(cell) + ivec2(int(floor(u_phase * u_scroll)), 0);
  float m;
  if(u_mode == 0){ m = float(B4[(ic.y & 3) * 4 + (ic.x & 3)]) / 16.0; }
  else if(u_mode == 1){ m = float(B8[(ic.y & 7) * 8 + (ic.x & 7)]) / 64.0; }
  else if(u_mode == 2){
    // line raster: rows alternate, dashes break up by column hash like the water in the reference
    float row = float(ic.y & 1);
    float dash = step(0.35, hash(vec2(float(ic.x >> 2), float(ic.y))));
    m = row * 0.5 + 0.25 * dash;
  }
  else { m = hash(vec2(ic) + 0.37); }
  // Dither only inside a tone band around each threshold (width = u_dither). Flat
  // regions outside the band stay solid, as in the board's 1-bit pieces.
  float band = max(u_dither * 0.22, 0.004);
  vec3 col;
  if(u_midtone > 0.5){
    float hi = u_threshold + 0.2;
    float lo = u_threshold - 0.2;
    float vh = clamp((lum - hi) / band * 0.5 + 0.5, 0.0, 1.0);
    float vl = clamp((lum - lo) / band * 0.5 + 0.5, 0.0, 1.0);
    col = vh > m ? u_paper : (vl > m ? u_mid : u_ink);
  } else {
    float v = clamp((lum - u_threshold) / band * 0.5 + 0.5, 0.0, 1.0);
    col = v > m ? u_paper : u_ink;
  }
  outColor = finish(col, vUv);
}
`;

export const VOXEL_FRAG = HEADER + `
uniform sampler2D u_image;
uniform float u_pixel;      // cell size in device px
uniform float u_threshold;  // cells darker than this are empty (sky)
uniform float u_depth;      // max height in cells
uniform float u_tilt;       // radians, extrusion direction in screen space
uniform float u_breathe;    // 0..1
uniform float u_shade;      // 0..1 face contrast
uniform vec3 u_ink;         // side tint
uniform vec3 u_paper;       // sky / background
uniform float u_invert;
uniform float u_slab;       // 1 = extrude the subject as layered slabs (pins 15, 29, 32, 36)
uniform float u_keep;       // 1 = top faces in the image's own colour

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// height of a cell in whole cells; < 0 means empty
float heightAt(vec2 cell, vec2 cells){
  if(cell.x < 0.0 || cell.y < 0.0 || cell.x >= cells.x || cell.y >= cells.y) return -1.0;
  vec2 cuv = (cell + 0.5) / cells;
  vec4 s4 = texture(u_image, cuv);
  vec3 c = s4.rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  if(u_invert > 0.5) lum = 1.0 - lum;
  if(u_slab > 0.5){
    // slab: the subject silhouette extruded; lightness picks one of u_depth planes
    if(s4.a < 0.5) return -1.0;
    float layers = max(u_depth, 1.0);
    return 1.0 + floor(clamp(lum, 0.0, 0.999) * layers);
  }
  if(lum < u_threshold) return -1.0;
  float t = (lum - u_threshold) / max(1e-3, 1.0 - u_threshold);
  // gentle, loop-exact breathing per cell; cursor focus lifts blocks softly
  t += u_breathe * 0.25 * sin(u_phase * TAU + hash(cell) * TAU);
  if(u_iMode == 3) t += iFall(cuv) * u_iAmt * 0.6;
  return floor(clamp(t, 0.0, 1.0) * u_depth + 0.5);
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
  float px = max(u_pixel, 2.0);
  vec2 cells = floor(u_res / px);
  vec2 p = vUv * u_res / px;                 // position in cell units
  vec2 dir = vec2(sin(u_tilt), cos(u_tilt)); // extrusion direction (cells per unit height)
  dir *= 0.5;                                // half a cell per height step keeps the stack compact
  float maxH = u_depth + 1.0;
  const float STEP = 0.125;

  vec3 col = u_paper;
  bool hit = false;
  // march from the highest possible layer down to the floor; first hit is the visible surface
  for(float s = 0.0; s <= 9.0; s += STEP){
    if(s > maxH) break;
    float k = maxH - s;
    vec2 q = p - dir * k;
    vec2 cell = floor(q);
    float h = heightAt(cell, cells);
    if(h >= 0.0 && h >= k){
      vec2 cuv = (cell + 0.5) / cells;
      vec3 base = texture(u_image, cuv).rgb;
      if(u_slab > 0.5){
        // paint texture inside the faces, like the watercolour fills of the pieces
        float L = dot(base, vec3(0.299, 0.587, 0.114));
        float lv = max(u_depth, 1.0) + 1.0;
        float Lq = (floor(clamp(L, 0.0, 0.999) * lv) + 0.5) / lv;
        base = clamp(base * (Lq / max(L, 1e-3)), 0.0, 1.0);
        base *= 0.9 + 0.14 * hash(floor(q * 3.0) + 0.7) * u_shade;
      }
      float top = step(h - k, STEP * 1.01);
      // which side did we land on: compare how far back the ray crossed the x vs y cell edge
      vec2 f = fract(q);
      vec2 ad = abs(dir) + 1e-4;
      vec2 fe = vec2(dir.x > 0.0 ? f.x : 1.0 - f.x, dir.y > 0.0 ? f.y : 1.0 - f.y);
      float sideX = step(fe.x / ad.x, fe.y / ad.y); // 1 = x-facing side, 0 = y-facing side
      float sh = u_shade;
      vec3 topCol  = mix(base, vec3(1.0), 0.18 * sh);
      vec3 sideA   = mix(base, u_ink, 0.22 * sh) * (1.0 - 0.18 * sh);
      vec3 sideB   = mix(base, u_ink, 0.40 * sh) * (1.0 - 0.34 * sh);
      vec3 side = mix(sideB, sideA, sideX);
      col = mix(side, topCol, top);
      // floor level (h == 0) reads as flat ground: keep it slightly darker
      if(h < 0.5) col = mix(base, u_ink, 0.1 * sh);
      hit = true;
      break;
    }
  }
  if(!hit) col = u_paper;
  outColor = finish(col, vUv);
}
`;

export const WAVES_FRAG = HEADER + `
uniform sampler2D u_image;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_falloff;   // 0 uniform, 1 fades toward top
uniform float u_cycles;    // integer: full sine cycles per loop

void main(){
  vec2 uv = vUv;
  float ph = u_phase * TAU * u_cycles;
  float env = mix(1.0, 1.0 - uv.y, u_falloff);
  float dx = sin(uv.y * u_frequency * TAU + ph) * u_amplitude * env;
  float dy = cos(uv.x * u_frequency * TAU * 0.7 - ph) * u_amplitude * 0.5 * env;
  vec2 d = vec2(dx, dy);
  outColor = texture(u_image, clamp(uv + d, 0.001, 0.999));
}
`;

export const GRAIN_FRAG = HEADER + `
uniform sampler2D u_image;
uniform float u_amount;
uniform float u_size;
uniform float u_frameSeed;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main(){
  vec4 c = texture(u_image, vUv);
  vec2 g = floor(vUv * u_res / max(u_size, 0.5)) + u_frameSeed * 100.0;
  float n = hash(g) - 0.5;
  // luminance-aware: more grain in midtones, like film
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float w = 1.0 - abs(lum - 0.5) * 1.2;
  c.rgb += n * u_amount * w;
  outColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
}
`;

export const BLIT_FRAG = HEADER + `
uniform sampler2D u_image;
uniform float u_flipY;
void main(){
  vec2 uv = vUv;
  if(u_flipY > 0.5) uv.y = 1.0 - uv.y;
  outColor = texture(u_image, uv);
}
`;

// The live stage keeps one long-lived Renderer; a hot update of the engine would leave it running stale shaders. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
