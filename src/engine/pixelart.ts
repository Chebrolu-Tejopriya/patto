import { HEADER, MASK, TECH } from './techniques';

/** Pixel illustration with optional stepped outlines and source or palette colours.
 * Cell-wide masking keeps silhouettes on the same square grid. */
export const PIXEL_ART_FRAG = HEADER + TECH + MASK + `
uniform int u_stopCount;
uniform vec3 u_colors[8];
uniform float u_positions[8];
vec4 sampleCell(vec2 centre, float px, out vec3 background){
  vec4 sampleColour = vec4(0.0);
  vec3 subjectColour = vec3(0.0);
  // Smooth within a cell, never across neighbouring blocks. This suppresses
  // photographic speckle while retaining the larger shapes of the source.
  float spread = mix(0.05, 0.38, clamp(u_dither, 0.0, 1.0));
  for(int y = -1; y <= 1; y++){
    for(int x = -1; x <= 1; x++){
      vec4 tap = texture(u_image, clamp(centre + vec2(float(x), float(y)) * px * spread / u_res, 0.0, 1.0));
      sampleColour += tap;
      subjectColour += tap.rgb * tap.a;
    }
  }
  vec3 foreground = subjectColour / max(sampleColour.a, 0.001);
  sampleColour /= 9.0;
  background = sampleColour.rgb;
  // Do not mix white canvas into the colours of thin branches and silhouettes.
  return vec4(sampleColour.a > 0.0 ? foreground : sampleColour.rgb, sampleColour.a);
}
void main(){
  float px = max(u_pixel, 2.0);
  vec2 cell = floor(vUv * u_res / px);
  vec2 centre = (cell + 0.5) * px / u_res;
  vec3 originalBackground;
  vec4 sampleColour = sampleCell(centre, px, originalBackground);
  vec3 sourceColour = sampleColour.rgb;
  float tone = luma(sourceColour);
  if(u_invert > 0.5) tone = 1.0 - tone;
  tone = clamp(tone + (0.5 - u_threshold) * 0.7, 0.0, 1.0);
  if(u_iMode == 3) tone = min(1.0, tone + iFall(centre) * u_iAmt * 0.18);
  vec3 colour = u_colors[0];
  for(int i = 1; i < 8; i++){
    if(i >= u_stopCount) break;
    if(tone >= (u_positions[i-1] + u_positions[i]) * 0.5) colour = u_colors[i];
  }
  if(u_keep > 0.5){
    float levels = max(2.0, u_depth);
    vec3 source = u_invert > 0.5 ? 1.0 - sourceColour : sourceColour;
    source = clamp(source + (tone - (u_invert > 0.5 ? 1.0 - luma(sourceColour) : luma(sourceColour))), 0.0, 1.0);
    colour = floor(source * (levels - 1.0) + 0.5) / (levels - 1.0);
  }
  float mask = step(0.35, sampleColour.a);
  if(u_thin > 0.0) mask *= step(0.35, subjectMask(centre));
  // Sprite mode: outlines use neighbouring whole cells, so corners stay stepped.
  // Only the darker side of a strong tonal edge gets an interior contour.
  // Flat mode skips this branch entirely, retaining the original palette render.
  if(u_shape == 1 && u_gap > 0.0 && mask > 0.5){
    float outline = 0.0;
    for(int radius = 1; radius <= 2; radius++){
      if(float(radius) > u_gap) break;
      for(int side = 0; side < 4; side++){
        vec2 direction = side == 0 ? vec2(1,0) : side == 1 ? vec2(-1,0) : side == 2 ? vec2(0,1) : vec2(0,-1);
        vec2 neighbourUV = centre + direction * float(radius) * px / u_res;
        // The image frame itself is not a subject boundary.
        if(any(lessThan(neighbourUV, vec2(0))) || any(greaterThan(neighbourUV, vec2(1)))) continue;
        vec3 neighbourBackground;
        vec4 neighbour = sampleCell(neighbourUV, px, neighbourBackground);
        outline = max(outline, 1.0 - step(0.35, neighbour.a));
        if(u_shade > 0.0 && neighbour.a >= 0.35){
          float difference = luma(neighbour.rgb) - luma(sourceColour);
          outline = max(outline, step(mix(0.55, 0.15, u_shade), difference));
        }
      }
    }
    colour = mix(colour, u_ink, outline);
  }
  vec3 background = u_bgMode > 0.5 ? u_paper : originalBackground;
  outColor = vec4(mix(background, colour, mask), 1.0);
}
`;

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
