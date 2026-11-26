# Patto

Patto is a browser studio that turns any image into hand-made looking patterns: halftone, cross-stitch, engraving, riso, paper mosaic and more, with animated ombres and loop-exact export.
Milestone 1: animated gradient engine, two effects, JSON presets, PNG and loop-exact MP4 export.

## Run

```
npm install
npm run dev
```

Open the printed URL in Chrome or Edge (MP4 export needs WebCodecs).

## Layout

- `src/model/look.ts` - the document model. One JSON object per look: gradient stops, effect stack, motion. Presets, versions and "export settings" all derive from it.
- `src/engine/` - WebGL2 pipeline. `shaders.ts` holds one GLSL pass per stage (gradient, waves, grain, blit); `renderer.ts` chains them through ping-pong framebuffers. Animation is driven by `u_phase` in [0,1) and every shader only uses it through sin/cos, so frame N leads straight back to frame 0.
- Photo restyling: upload an image (left panel or drop on the canvas). The stylize pass in `shaders.ts` gradient-maps its luminance through the preset's colour ramp, posterizes, fogs it with the animated gradient, adds an orb and vignette. Every preset thumbnail becomes a variant of the photo. The photo is an app asset, not part of the Look JSON.
- Presets in `src/model/presets.ts` are distilled from the user's Pinterest "Patterns" board (surreal minimalist landscapes, one tight palette each).
- `src/export/` - PNG (offscreen render at native size), MP4 (frame-by-frame WebCodecs + mp4-muxer), JSON import/export.
- `src/store.ts` - zustand store; saved looks and versions persist to localStorage.
- `src/ui/` - inspector, live stage, library (export, saved, presets).

## Adding an effect

1. Add a fragment shader to `shaders.ts` that samples `u_image` and uses `u_phase` via sin/cos only.
2. Add its parameters to `Effects` in `look.ts`.
3. Add a pass in `Renderer.render` and a section in `Inspector.tsx`.
