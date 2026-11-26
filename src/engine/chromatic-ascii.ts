/** Fine coloured type on paper. Separate from the original ASCII modes. */
export const CHROMATIC_ASCII = `
uniform int u_stopCount;
uniform vec3 u_colors[8];
uniform float u_positions[8];
const int CG[105] = int[105](
  0,0,0,0,0,4,0,             // .
  0,4,0,0,4,0,0,             // :
  0,4,4,31,4,4,0,            // +
  0,0,14,17,17,14,0,         // o
  0,0,17,10,4,10,17,         // x
  0,21,14,31,14,21,0,        // *
  17,17,10,4,10,17,17,       // X
  10,31,10,10,31,10,0,       // #
  25,26,4,4,11,19,0,         // %
  14,17,23,21,23,16,14,      // @
  1,2,2,4,8,8,16,            // slash
  16,8,8,4,2,2,1,            // backslash
  0,0,31,0,31,0,0,           // =
  0,0,0,31,0,0,0,            // -
  4,4,4,4,4,4,4              // |
);
float characterBit(int glyph, vec2 uv){
  if(any(lessThan(uv, vec2(0))) || any(greaterThanEqual(uv, vec2(1)))) return 0.0;
  int x = clamp(int(uv.x * 5.0), 0, 4);
  int y = clamp(int((1.0 - uv.y) * 7.0), 0, 6);
  return float((CG[glyph * 7 + y] >> (4 - x)) & 1);
}
float smoothCharacter(int glyph, vec2 g, vec2 aa){
  return 0.25 * (characterBit(glyph,g+aa) + characterBit(glyph,g-aa)
    + characterBit(glyph,g+vec2(aa.x,-aa.y)) + characterBit(glyph,g+vec2(-aa.x,aa.y)));
}
void chromaticAscii(){
  float px = max(u_pixel, 8.0);
  vec2 cs = vec2(px * 0.75, px);
  vec2 cell = floor(vUv * u_res / cs);
  vec2 centre = (cell + 0.5) * cs / u_res;
  vec4 sampleSum = vec4(0);
  vec3 foreground = vec3(0);
  for(int y = -1; y <= 1; y++){
    for(int x = -1; x <= 1; x++){
      vec4 tap = texture(u_image, clamp(centre + vec2(x,y) * cs * 0.25 / u_res, 0.0, 1.0));
      sampleSum += tap;
      foreground += tap.rgb * tap.a;
    }
  }
  vec3 c = foreground / max(sampleSum.a, 0.001);
  float lum = luma(c);
  float chroma = max(c.r, max(c.g,c.b)) - min(c.r, min(c.g,c.b));
  // Saturation helps pale petals retain marks instead of disappearing.
  float tone = u_invert > 0.5 ? lum : max(1.0 - lum, chroma * 0.65);
  tone = clamp((tone + (0.5 - u_threshold)) * (0.5 + u_dither), 0.0, 1.0);
  if(u_iMode == 3) tone += iFall(centre) * u_iAmt * 0.2;
  tone = clamp(tone, 0.0, 1.0);
  int glyph = int(clamp(floor(tone * 9.0 + hash(cell) * 1.2), 0.0, 9.0));
  if(tone > 0.22 && tone < 0.65 && hash(cell + 23.0) > 0.88)
    glyph = 10 + int(floor(hash(cell + 91.0) * 3.0));
  vec2 scale = mix(vec2(0.90,0.88), vec2(0.64,0.65), clamp(u_gap,0.0,1.0));
  vec2 g = (fract(vUv * u_res / cs) - 0.5) / scale + 0.5;
  vec2 aa = 0.25 / (cs * scale);
  float mark = smoothCharacter(glyph,g,aa);
  mark *= smoothstep(0.015,0.10,tone);
  vec3 ink = c;
  if(u_keep < 0.5){
    ink = u_colors[0];
    for(int i=1;i<8;i++){
      if(i >= u_stopCount) break;
      ink = mix(ink,u_colors[i],clamp((lum-u_positions[i-1])/max(u_positions[i]-u_positions[i-1],0.001),0.0,1.0));
    }
  }
  // Keep coloured type readable without turning pale colours black.
  ink *= min(1.0,0.66/max(luma(ink),0.001));
  ink = mix(u_paper,ink,mix(0.45,1.0,u_shade));
  float mask = smoothstep(0.12,0.65,sampleSum.a/9.0);
  if(u_thin > 0.0) mask *= subjectMask(centre);
  vec3 background = u_bgMode > 0.5 ? u_paper : texture(u_image,vUv).rgb;
  vec3 colour = mix(background,mix(u_paper,ink,mark),mask);
  if(u_breathe > 0.0){
    // A few independent glints per region. Integer cycle seeds close the loop
    // exactly, including exports; no wall-clock time or mutable particle state.
    vec2 blockSize = vec2(14,12);
    vec2 block = floor(cell / blockSize);
    float cycles = max(1.0,floor(u_scroll));
    float clock = u_phase * cycles + hash(block + 7.3);
    float cycle = mod(floor(clock),cycles);
    float age = fract(clock) / 0.32;
    vec2 seed = block + cycle * vec2(31.7,19.3);
    vec2 anchor = block * blockSize + 2.0 + floor(vec2(hash(seed+1.2),hash(seed+4.7)) * (blockSize-4.0));
    vec2 anchorUV = (anchor+0.5)*cs/u_res;
    // Allow a little air around silhouettes, but leave distant paper quiet.
    float nearby = 0.0;
    for(int i=0;i<5;i++){
      vec2 offset = i==0 ? vec2(0) : i==1 ? vec2(3,0) : i==2 ? vec2(-3,0) : i==3 ? vec2(0,3) : vec2(0,-3);
      vec4 tap = texture(u_image,clamp(anchorUV+offset*cs/u_res,0.0,1.0));
      nearby = max(nearby,tap.a * (1.0-smoothstep(0.90,0.98,luma(tap.rgb))));
    }
    if(age < 1.0 && nearby > 0.15 && hash(seed+13.0) < u_breathe * 0.55){
      int frame = int(floor(age * 7.0));
      vec2 d = abs(cell-anchor);
      int sparkle = -1;
      if(d.x < 0.5 && d.y < 0.5) sparkle = frame==0 || frame==6 ? 0 : frame==1 || frame==5 ? 2 : 5;
      if(frame>=2 && frame<=4){
        if(d.x==1.0 && d.y==0.0) sparkle=13;
        if(d.x==0.0 && d.y==1.0) sparkle=14;
        if(frame==3 && d.x==2.0 && d.y==0.0) sparkle=0;
      }
      if(sparkle >= 0){
        float star = smoothCharacter(sparkle,g,aa);
        float fade = smoothstep(0.0,0.10,age)*(1.0-smoothstep(0.82,1.0,age));
        colour = mix(colour,mix(u_paper,u_mid,star),fade);
      }
    }
  }
  outColor = vec4(colour,1);
}
`;
