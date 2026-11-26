// The document model. Everything a look needs is in this one JSON-serialisable
// object: presets, versions, share links and "export settings" all derive from it.

export type ColorStop = { color: string; pos: number }; // hex colour, position 0..1

export type GradientType = 'linear' | 'radial' | 'mesh';

export type Gradient = {
  type: GradientType;
  stops: ColorStop[];
  angle: number; // degrees, linear only
  warp: number; // 0..1 domain-warp strength (the "ombre flow")
  scale: number; // noise scale
  flow: number; // how far the noise travels over one loop
  seed: number;
};

export type Effects = {
  waves: { on: boolean; amplitude: number; frequency: number; falloff: number; cycles: number };
  grain: { on: boolean; amount: number; size: number };
};

export type Motion = {
  loopSeconds: number;
  fps: number;
};

/** How an uploaded photo is restyled into the look. The photo itself is not
 * part of the document; it is an asset held by the app. */
export type PhotoStyle = {
  fit: 'cover' | 'contain';
  blend: number; // 0 = original photo, 1 = fully gradient-mapped through the ramp
  posterize: number; // 0 = off, otherwise number of tonal levels
  exposure: number; // -1..1
  contrast: number; // 0.5..2
  haze: number; // 0..1 how much the animated gradient fogs the image
  hazeHeight: number; // 0..1 portion of the frame (from the top) the fog covers
  vignette: number; // 0..1
};

/** A soft sun / moon disc coloured from the ramp. */
export type Orb = {
  on: boolean;
  x: number; // 0..1
  y: number; // 0..1
  radius: number; // relative to frame height
  softness: number;
  colorPos: number; // position on the ramp
  glow: number;
};

/** A pattern technique applied to the image (photo or gradient). This is the
 * heart of the product: hand-picked rendering styles, not stock filters. */
export type PatternType = 'none' | 'bitmap' | 'voxel' | 'halftone' | 'print' | 'stitch' | 'ascii' | 'hatch' | 'riso' | 'papercut' | 'glitch' | 'mosaic' | 'tiles' | 'soft' | 'cells' | 'split' | 'blocks' | 'glyph';
export type BgMode = 'keep' | 'paper';
export type Shape = 'dot' | 'square' | 'diamond' | 'ring';
export type DitherMode = 'bayer4' | 'bayer8' | 'lines' | 'noise';
export type Pattern = {
  type: PatternType;
  pixel: number; // cell size in px at 1080 height
  threshold: number; // 0..1 ink/paper split
  dither: number; // 0..1 how much the dither matrix spreads tones
  mode: DitherMode;
  ink: string;
  paper: string;
  midtone: boolean; // use a third mid colour for 3-level dithering
  mid: string;
  scroll: number; // integer cells the matrix scrolls per loop (0 = still)
  invert: boolean;
  // voxel technique
  depth: number; // max block height in cells (1..8)
  tilt: number; // extrusion direction in degrees (screen), 0 = up
  breathe: number; // 0..1 how much heights breathe over the loop
  shade: number; // 0..1 contrast between the three faces
  // shared by the newer techniques
  angle: number; // grid / stroke angle in degrees
  gap: number; // 0..1 generic spacing / scatter / thread width
  keep: boolean; // keep image colours (otherwise ink/paper duotone)
  shape: Shape; // halftone dot shape
  // subject / background separation (the board applies patterns to the subject only)
  subject: boolean; // pattern the subject only when a flat background is detected
  tolerance: number; // 0 = auto; otherwise colour distance that counts as subject
  thin: number; // px at 1080: features thinner than this keep the original
  bgMode: BgMode; // what the background becomes
  marks: string; // cells: mark per tone level, comma list of none|dot|plus|ring|disc|square|xsquare|half|fill|dotscreen|screen|x|grid|stipple
  ground: string; // cells: mark repeated over the background (pins 59, 64), none = plain
};

export type LookKind = 'pattern' | 'ombre';

/** How the look reacts to the cursor on the live stage. Exports ignore it. */
export type InteractMode = 'orb' | 'warp' | 'light' | 'focus' | 'trail';
export type Interact = {
  on: boolean;
  mode: InteractMode;
  strength: number; // 0..1
  radius: number; // 0.05..1, relative to frame height
  follow: number; // 0.02..1 smoothing: how quickly the effect catches up with the cursor
  fadeIdle: boolean; // fade the effect out when the cursor leaves (else it drifts back to centre)
};

export type Look = {
  schema: 1;
  id: string;
  name: string;
  version: number;
  kind: LookKind;
  size: { w: number; h: number };
  gradient: Gradient;
  photo: PhotoStyle;
  orb: Orb;
  pattern: Pattern;
  interact: Interact;
  effects: Effects;
  motion: Motion;
};

export const MAX_STOPS = 8;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultLook(): Look {
  return {
    schema: 1,
    id: uid(),
    name: 'Untitled',
    version: 1,
    kind: 'ombre',
    size: { w: 1920, h: 1080 },
    gradient: {
      type: 'mesh',
      stops: [
        { color: '#1a0b3d', pos: 0 },
        { color: '#7b2cbf', pos: 0.35 },
        { color: '#ff7b54', pos: 0.7 },
        { color: '#ffd98e', pos: 1 },
      ],
      angle: 35,
      warp: 0.55,
      scale: 1.6,
      flow: 1,
      seed: 7,
    },
    photo: { fit: 'cover', blend: 0.85, posterize: 0, exposure: 0, contrast: 1.1, haze: 0.35, hazeHeight: 0.5, vignette: 0.25 },
    orb: { on: false, x: 0.5, y: 0.62, radius: 0.18, softness: 0.01, colorPos: 0.9, glow: 0.4 },
    interact: { on: true, mode: 'warp', strength: 0.4, radius: 0.55, follow: 0.4, fadeIdle: false },
    pattern: { type: 'none', pixel: 6, threshold: 0.5, dither: 0.9, mode: 'bayer4', ink: '#1e2235', paper: '#e9ecdf', midtone: false, mid: '#8a8f9c', scroll: 0, invert: false, depth: 4, tilt: 35, breathe: 0.2, shade: 0.5, angle: 0, gap: 0.3, keep: false, shape: 'dot', subject: true, tolerance: 0, thin: 0, bgMode: 'keep', marks: 'none,dot,ring,disc,square,xsquare', ground: 'none' },
    effects: {
      waves: { on: true, amplitude: 0.04, frequency: 3, falloff: 0.5, cycles: 1 },
      grain: { on: true, amount: 0.12, size: 1.5 },
    },
    motion: { loopSeconds: 6, fps: 30 },
  };
}

export function cloneLook(l: Look): Look {
  return JSON.parse(JSON.stringify(l));
}

/** Fill any missing fields (older saved files) from the defaults. */
export function normalizeLook(input: Partial<Look>): Look {
  const d = defaultLook();
  const merge = <T extends object>(base: T, over: Partial<T> | undefined): T =>
    over ? ({ ...base, ...over } as T) : base;
  return {
    ...d,
    ...input,
    size: merge(d.size, input.size),
    gradient: merge(d.gradient, input.gradient),
    photo: merge(d.photo, input.photo),
    orb: merge(d.orb, input.orb),
    pattern: merge(d.pattern, input.pattern),
    interact: merge(d.interact, input.interact),
    effects: {
      waves: merge(d.effects.waves, input.effects?.waves),
      grain: merge(d.effects.grain, input.effects?.grain),
    },
    motion: merge(d.motion, input.motion),
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
