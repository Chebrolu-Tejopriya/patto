import { defaultLook, type Look } from './look';

// Presets distilled from the "Patterns" Pinterest board: surreal minimalist
// landscapes, one tight palette per image, soft horizon haze, a sun or moon
// disc, posterized flat shading and film grain. Each preset is both a standalone
// animated ombre and a grading recipe for uploaded photos.

type Patch = (l: Look) => void;

function make(id: string, name: string, patch: Patch): Look {
  const l = defaultLook();
  l.id = id;
  l.name = name;
  patch(l);
  return l;
}

const stops = (...pairs: [string, number][]) => pairs.map(([color, pos]) => ({ color, pos }));

const PATTERN_PRESETS: Look[] = [
  make('gapped-mosaic', 'Gapped Mosaic', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pin 2: three-colour square-cell mosaic with density dither, no glyphs
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 7, depth: 2, threshold: 0.5, dither: 1, gap: 0.55, shade: 0, marks: 'fill,fill,dot', keep: true, paper: '#20223a', ink: '#20223a', mid: '#6b6f45', subject: true, bgMode: 'keep' };
    l.gradient.stops = stops(['#20223a', 0], ['#6b6f45', 0.5], ['#d7a46f', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('cross-field', 'Cross Field', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pins 59, 64: figure in white grid, black and red fills on a blue ground tiled with small x crosses
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 10, depth: 2, threshold: 0.5, dither: 0.15, gap: 0.9, shade: 0, marks: 'fill,fill,grid', ground: 'x', keep: false, paper: '#2a1fd6', ink: '#0a0a0a', mid: '#e8231a', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#2a1fd6', 0], ['#e8231a', 0.6], ['#ffffff', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('conf-screens', 'Conference Screens', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pins 56, 62: large squares, each filled with one screen density: solid, coarse dots, fine dots, empty
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 40, depth: 3, threshold: 0.5, dither: 0, gap: 0.9, shade: 0, marks: 'fill,screen,dotscreen,none', ground: 'none', keep: false, paper: '#ffffff', ink: '#2b5bd7', mid: '#2b5bd7', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#2b5bd7', 0], ['#ffffff', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 45;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('stipple-cube', 'Stipple', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pin 69: random white stipple on blue, denser where the subject is light, solid at the brightest
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 5, depth: 4, threshold: 0.5, dither: 1, gap: 0.8, shade: 0, marks: 'none,stipple,stipple,disc,fill', ground: 'none', keep: false, invert: true, paper: '#4aa3df', ink: '#ffffff', mid: '#ffffff', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#4aa3df', 0], ['#ffffff', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('two-ink-lines', 'Two-ink Lines', (l) => {
    l.interact = { on: true, mode: 'warp', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 71: blue outline plus diagonal line raster for the mids, solid in the shadows, white paper
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'riso', shape: 'square', threshold: 0.42, dither: 0.5, gap: 0.15, shade: 1, depth: 3, breathe: 0, ink: '#1a2fd6', mid: '#1a2fd6', paper: '#ffffff', keep: false, invert: false, subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#1a2fd6', 0], ['#ffffff', 1]);
    l.gradient.type = 'linear';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.25, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('line-room', 'Line Drawing', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 57: one-pixel blue outlines broken into dashes, sparse pixel dither in the shadows, grey paper
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'hatch', shape: 'diamond', pixel: 10, threshold: 0.5, dither: 0.6, gap: 0.3, shade: 0, depth: 1, ink: '#2d5ec4', paper: '#dcdcdc', keep: false, subject: false, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#2d5ec4', 0], ['#dcdcdc', 1]);
    l.gradient.type = 'linear';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('iso-slabs', 'Iso Slabs', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pins 36, 66, 67: the subject as stacked lilac slabs with dark outlines on every edge, white ground
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'voxel', shape: 'square', pixel: 22, depth: 4, tilt: 30, shade: 0.8, gap: 0.6, breathe: 0, keep: false, ink: '#3b1a6e', mid: '#cdb6ea', paper: '#ffffff', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#ffffff', 0], ['#cdb6ea', 0.6], ['#3b1a6e', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.15, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.05, size: 1 };
  }),
  make('rain-dashes', 'Rain Dashes', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 61: vertical dashes only, density from tone, green ink on white, whole frame
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'hatch', shape: 'square', pixel: 7, angle: 90, depth: 1, threshold: 0.5, dither: 1, gap: 0.8, shade: 1, scroll: 0, ink: '#1f7a3a', paper: '#ffffff', keep: false, subject: false, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#1f7a3a', 0], ['#ffffff', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('sunset-three', 'Three-tone Sunset', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 60: navy, olive and orange, dot gradient only where tones change, flats solid
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 6, threshold: 0.5, dither: 0.4, mode: 'bayer8', midtone: true, ink: '#1c2630', mid: '#6b6a3a', paper: '#f0924a', scroll: 0, invert: false, subject: false, bgMode: 'keep' };
    l.gradient.stops = stops(['#1c2630', 0], ['#6b6a3a', 0.5], ['#f0924a', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('dot-matrix', 'Dot Matrix', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pins 9, 53, 44: hollow rings for the subject's light tones, plus / disc / square by level, nothing outside
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 12, depth: 3, threshold: 0.5, dither: 0.3, gap: 0.8, shade: 0, marks: 'plus,ring,disc,xsquare', keep: true, paper: '#060607', ink: '#2f6f5a', mid: '#8fd0a8', subject: true, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#060607', 0], ['#2f6f5a', 0.45], ['#f28ad1', 0.8], ['#fff1c7', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.25, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('square-rain', 'Square Rain', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pin 28: white squares, half squares and dots by tone on a flat lavender ground, one colour
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 16, depth: 3, threshold: 0.6, dither: 0.6, gap: 1, shade: 0, marks: 'none,dot,half,square', keep: false, paper: '#aeb6d9', ink: '#ffffff', mid: '#ffffff', subject: true, bgMode: 'paper' };
    l.gradient.stops = stops(['#aeb6d9', 0], ['#d8dcef', 0.6], ['#ffffff', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('led-dissolve', 'LED Dissolve', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.4, radius: 0.4, follow: 0.4, fadeIdle: true };
    // pin 27: square LEDs in two sizes, dropping out at random toward the dark
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'cells', pixel: 11, depth: 3, threshold: 0.5, dither: 0.4, gap: 0.6, shade: 0.6, marks: 'none,dot,square,square', keep: false, paper: '#4a2100', ink: '#ff7a1a', mid: '#ff9a3c', subject: true, bgMode: 'paper', invert: false };
    l.gradient.stops = stops(['#4a2100', 0], ['#ff7a1a', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('dash-drawing', 'Dash Drawing', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 47: straight dashes, one direction per surface, fixed length, single blue, flat ground
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'hatch', shape: 'square', pixel: 13, angle: 80, depth: 8, threshold: 0.5, dither: 1, gap: 0.3, shade: 0, scroll: 0, ink: '#2e55d8', paper: '#e6efd9', keep: false, subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#2e55d8', 0], ['#e6efd9', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 60;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('glass-tiles', 'Glass Tiles', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.6, follow: 0.4, fadeIdle: true };
    // pins 3, 4: a blurred subject behind a grid of frosted glass tiles, glow halo, flat peach wash
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'soft', shape: 'square', pixel: 34, depth: 4, shade: 0.9, gap: 0.6, dither: 0.2, breathe: 0.1, paper: '#ffe2cc', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#ffe2cc', 0], ['#ffb08a', 0.5], ['#fff4ea', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.12, size: 1.1 };
  }),
  make('pixel-shards', 'Pixel Shards', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pins 15, 29, 32, 36: the subject silhouette extruded as layered slabs in perspective, paint inside the faces, flat dark ground
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'voxel', shape: 'square', pixel: 16, depth: 3, tilt: 32, shade: 0.7, breathe: 0.05, keep: true, ink: '#0b0b0b', paper: '#0a0a0a', subject: true, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#0a0a0a', 0], ['#2e7d4f', 0.45], ['#d84a7a', 0.8], ['#ffe08a', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.15, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.04, size: 1 };
  }),
  make('half-pixel', 'Half Pixel', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 49: the upper-left of the subject turns into flat pixels, the rest stays photographic
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'split', shape: 'dot', pixel: 30, angle: -45, threshold: 0.5, dither: 0.4, breathe: 0.2, paper: '#efede6', subject: true, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#efede6', 0], ['#f26d7d', 0.5], ['#7fd1c5', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.05, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('pixel-cutout', 'Pixel Cut-out', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 35: blocky silhouette, photo kept inside, white outside
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'split', shape: 'square', pixel: 44, paper: '#ffffff', subject: true, tolerance: 0, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#ffffff', 0], ['#7bbf6a', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('squircle-blocks', 'Squircle Blocks', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 38: rounded blocks with vertical gradients, outline echoes behind, no shadows
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'blocks', pixel: 30, depth: 2, shade: 0.6, dither: 0.3, paper: '#efefef', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#efefef', 0], ['#1f8a3a', 0.5], ['#b7e03a', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('flower-field', 'Flower Field', (l) => {
    l.interact = { on: true, mode: 'trail', strength: 0.5, radius: 0.35, follow: 0.4, fadeIdle: true };
    // pin 39: flower glyphs where the subject is dark, dots elsewhere; the pointer paints flowers that fade
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'glyph', pixel: 22, threshold: 0.5, dither: 0.6, gap: 0.5, keep: false, ink: '#b7422f', mid: '#4a79c9', paper: '#efe9dc', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#efe9dc', 0], ['#e0a04a', 0.5], ['#b7422f', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.05, size: 1.2 };
  }),
  make('type-reveal', 'Type Reveal', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 33: the subject mask reveals rows of typeset words in the image colour on canvas
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'ascii', shape: 'square', pixel: 9, threshold: 0.5, dither: 0.6, keep: true, ink: '#4a5aa8', paper: '#efe6d6', subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#efe6d6', 0], ['#7d8fd6', 0.5], ['#3b4a9a', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.15, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.06, size: 1.3 };
  }),
  make('dot-veil', 'Dot Veil', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // pin 42: uniform cyan dots over the subject only, photo kept underneath
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'halftone', shape: 'dot', pixel: 9, angle: 0, threshold: 0.05, dither: 0, gap: 0.62, shade: 1, ink: '#7fe3ff', paper: '#ffffff', keep: false, subject: true, bgMode: 'keep', thin: 0 };
    l.gradient.stops = stops(['#2b3a4a', 0], ['#9bb8c9', 1]);
    l.gradient.type = 'linear';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('paper-mosaic', 'Paper Mosaic', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board pin 0: flower head as irregular translucent tiles, stem and bee untouched, sepia shadow copy
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'tiles', pixel: 22, gap: 0.55, shade: 0.6, dither: 0.5, depth: 2, tilt: -40, breathe: 0.1, paper: '#f6f1e8', subject: true, tolerance: 0, thin: 14, bgMode: 'keep' };
    l.gradient.stops = stops(['#f6f1e8', 0], ['#f2a7b6', 0.5], ['#d8467a', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.05, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.03, size: 1 };
  }),
  make('engraving', 'Engraving', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: dashed blue strokes (chair), BIT MAP etching; strokes follow the form
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'hatch', pixel: 10, angle: 35, threshold: 0.5, dither: 0.7, gap: 0.2, shade: 0.4, depth: 7, scroll: 0, ink: '#1b2a6b', paper: '#eef1e4', keep: false, invert: false };
    l.gradient.stops = stops(['#1b2a6b', 0], ['#8a97c9', 0.5], ['#eef1e4', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 70;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.03, size: 1 };
  }),
  make('copper-plate', 'Copper Plate', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // fine sepia etching, tight spacing, full contour following
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'hatch', pixel: 7, angle: 20, threshold: 0.48, dither: 0.9, gap: 0.08, shade: 0.25, depth: 8, scroll: 0, ink: '#2a1a12', paper: '#f1e8d8', keep: false, invert: false };
    l.gradient.stops = stops(['#2a1a12', 0], ['#a08468', 0.5], ['#f1e8d8', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.35, haze: 0, vignette: 0.15 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.04, size: 1.2 };
  }),
  make('riso-duotone', 'Riso Duotone', (l) => {
    l.interact = { on: true, mode: 'warp', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: lantern night poster; deep blue and orange plates on cream
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'riso', threshold: 0.38, dither: 0.4, gap: 0.4, shade: 0.9, depth: 3, breathe: 0.2, ink: '#1d2a6e', mid: '#f28c28', paper: '#f4ecdc', keep: false, invert: false };
    l.gradient.stops = stops(['#1d2a6e', 0], ['#f28c28', 0.55], ['#f4ecdc', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.07, size: 1.3 };
  }),
  make('riso-street', 'Riso Street', (l) => {
    l.interact = { on: true, mode: 'warp', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: flat-colour Tokyo street poster; image colours quantised, plates out of register
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'riso', threshold: 0.5, dither: 0.3, gap: 0.35, shade: 1, depth: 3, breathe: 0.15, ink: '#1d2a6e', mid: '#f28c28', paper: '#f2e9d8', keep: true, invert: false };
    l.gradient.stops = stops(['#1f3a5f', 0], ['#e8734a', 0.5], ['#f2e9d8', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.25, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.06, size: 1.2 };
  }),
  make('paper-cut', 'Paper Cut', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.5, radius: 0.6, follow: 0.4, fadeIdle: false };
    // board: dark layered florals; light from the top-left
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'papercut', depth: 5, angle: 45, gap: 0.5, shade: 0.8, threshold: 0.5, breathe: 0.15, ink: '#0d1b14', mid: '#2e7d4f', paper: '#e7f0c8', keep: false, invert: false };
    l.gradient.stops = stops(['#0d1b14', 0], ['#2e7d4f', 0.5], ['#e7f0c8', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.03, size: 1 };
  }),
  make('print-screen', 'Print Screen', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // process-colour screens, like a magnified magazine page
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'print', pixel: 8, angle: 0, threshold: 0.5, dither: 0.3, shade: 0.8, gap: 0.15, breathe: 0.1, ink: '#141414', paper: '#f6f3ea', keep: true, invert: false };
    l.gradient.stops = stops(['#1b3a8a', 0], ['#e24b8d', 0.5], ['#ffd84a', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.02, size: 1 };
  }),
  make('halftone-press', 'Halftone Press', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: blue dot clouds on white, slightly rotated screen
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'halftone', pixel: 14, angle: 15, threshold: 0.5, dither: 0.6, gap: 0.2, shape: 'dot', ink: '#2b5bd7', paper: '#f7f8fb', keep: false, invert: false, breathe: 0.1 };
    l.gradient.stops = stops(['#1a3fb0', 0], ['#7fa0f0', 0.5], ['#ffffff', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.15, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('led-matrix', 'LED Matrix', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: coloured square dots on black (globe, SILO)
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'halftone', pixel: 13, angle: 0, threshold: 0.45, dither: 0.8, gap: 0.3, shape: 'square', ink: '#ff8a3d', paper: '#070709', keep: true, invert: true, breathe: 0.25 };
    l.gradient.stops = stops(['#1b0d00', 0], ['#ff6a00', 0.55], ['#ffd27a', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 20;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.35, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.04, size: 1 };
  }),
  make('cross-stitch', 'Cross Stitch', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: daisy / monstera charts on cream aida, quantised palette
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'stitch', pixel: 16, threshold: 0.82, dither: 0.5, gap: 0.4, shade: 0.8, ink: '#2d3a8c', mid: '#6b7cd9', paper: '#f3eee2', keep: true, invert: false, breathe: 0, subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#2d3a8c', 0], ['#6b9cd9', 0.5], ['#f3eee2', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.05, size: 1.4 };
  }),
  make('sampler-red', 'Sampler Red', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.3, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: single-colour red sampler on linen
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'stitch', pixel: 14, threshold: 0.6, dither: 0.3, gap: 0.35, shade: 0.7, ink: '#b7332a', mid: '#b7332a', paper: '#efe6d3', keep: false, invert: false, breathe: 0, subject: true, bgMode: 'paper', thin: 0 };
    l.gradient.stops = stops(['#b7332a', 0], ['#efe6d3', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.06, size: 1.6 };
  }),
  make('terminal-ascii', 'Terminal ASCII', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // board: ASCII-style pixel scenes in colour on deep navy
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'ascii', pixel: 16, threshold: 0.5, dither: 0.7, ink: '#8bd3ff', paper: '#0b1020', keep: true, invert: true, breathe: 0.15 };
    l.gradient.stops = stops(['#0b1020', 0], ['#2a7fc6', 0.5], ['#d8f3ff', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.4, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('typewriter', 'Typewriter', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // black glyphs on warm paper
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'ascii', pixel: 15, threshold: 0.5, dither: 0.6, ink: '#1a1a1a', paper: '#f4f1ea', keep: false, invert: false, breathe: 0 };
    l.gradient.stops = stops(['#1a1a1a', 0], ['#f4f1ea', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.25, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.04, size: 1 };
  }),
  make('datamosh', 'Datamosh', (l) => {
    l.interact = { on: true, mode: 'warp', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: false };
    // board: broken-frame collages with slipped bands and chroma split
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'glitch', pixel: 6, threshold: 0.5, dither: 0.8, shade: 0.6, gap: 0.5, breathe: 0.3, mid: '#ff3fb0', invert: false };
    l.gradient.stops = stops(['#120a2a', 0], ['#ff7ad9', 0.4], ['#7af0c0', 0.75], ['#fff2b0', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.15, haze: 0, vignette: 0.2 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.08, size: 1 };
  }),
  make('airbrush-bloom', 'Airbrush Bloom', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.4, radius: 0.6, follow: 0.4, fadeIdle: true };
    // board: Clover / Dessn posters, blurred motif with grain on a soft wash
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'soft', pixel: 60, shade: 0.9, depth: 3, dither: 0.35, gap: 0.35, breathe: 0.2, paper: '#ffe3d0' };
    l.gradient.stops = stops(['#ffd9c2', 0], ['#ff9f7a', 0.5], ['#ffe9dc', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0.15, posterize: 0, contrast: 1.1, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.18, size: 1.2 };
  }),
  make('voxel-sky', 'Voxel Sky', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // the reference: white block clouds floating in a flat blue sky, soft left light
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'voxel', pixel: 22, threshold: 0.42, dither: 0, mode: 'bayer4', ink: '#2a7fc6', paper: '#1d8fde', midtone: false, mid: '#8a8f9c', scroll: 0, invert: false, depth: 4, tilt: 35, breathe: 0.25, shade: 0.55 };
    l.gradient.stops = stops(['#1d8fde', 0], ['#bfe3f7', 0.55], ['#ffffff', 1]);
    l.gradient.type = 'mesh';
    l.gradient.scale = 1.4;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.04, size: 1 };
  }),
  make('voxel-night', 'Voxel Night', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // neon city blocks on ink; taller stacks, steeper tilt
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'voxel', pixel: 14, threshold: 0.3, dither: 0, mode: 'bayer4', ink: '#0b0a1a', paper: '#0b0a1a', midtone: false, mid: '#8a8f9c', scroll: 0, invert: false, depth: 7, tilt: 20, breathe: 0.35, shade: 0.8 };
    l.gradient.stops = stops(['#1a1540', 0], ['#ff4fa3', 0.5], ['#ffd166', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.06, size: 1 };
  }),
  make('bitmap-night', 'Bitmap Night', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // the reference: navy ink on cream, 1-bit Bayer, chunky 6px cells, still
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 6, threshold: 0.5, dither: 0.9, mode: 'bayer4', ink: '#1e2235', paper: '#e9ecdf', midtone: false, mid: '#8a8f9c', scroll: 0, invert: false };
    l.gradient.stops = stops(['#1e2235', 0], ['#5a6078', 0.5], ['#e9ecdf', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.warp = 0.6;
    l.photo = { ...l.photo, blend: 0, posterize: 0, contrast: 1.25, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('bitmap-water', 'Bitmap Water', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // line raster variant, like the water in the reference
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 5, threshold: 0.48, dither: 1.1, mode: 'lines', ink: '#1e2235', paper: '#e9ecdf', midtone: false, mid: '#8a8f9c', scroll: 4, invert: false };
    l.gradient.stops = stops(['#1e2235', 0], ['#e9ecdf', 1]);
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.photo = { ...l.photo, blend: 0, contrast: 1.3, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves = { on: true, amplitude: 0.01, frequency: 4, falloff: 0, cycles: 1 };
    l.effects.grain.on = false;
  }),
  make('handheld', 'Handheld', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // four-shade green LCD
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 8, threshold: 0.5, dither: 0.7, mode: 'bayer8', ink: '#0f380f', paper: '#9bbc0f', midtone: true, mid: '#306230', scroll: 0, invert: false };
    l.gradient.stops = stops(['#0f380f', 0], ['#306230', 0.5], ['#9bbc0f', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, contrast: 1.2, haze: 0, vignette: 0 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
  make('newsprint', 'Newsprint', (l) => {
    l.interact = { on: true, mode: 'focus', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // fine 8x8 dither, black on warm paper, slow matrix drift
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 3, threshold: 0.52, dither: 1, mode: 'bayer8', ink: '#141210', paper: '#f1ece0', midtone: false, mid: '#777', scroll: 8, invert: false };
    l.gradient.stops = stops(['#141210', 0], ['#f1ece0', 1]);
    l.gradient.type = 'mesh';
    l.photo = { ...l.photo, blend: 0, contrast: 1.15, haze: 0, vignette: 0.2 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.05, size: 1 };
  }),
  make('phosphor', 'Phosphor', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: true };
    // amber terminal, noise dither, inverted so bright areas glow
    l.kind = 'pattern';
    l.pattern = { ...l.pattern, type: 'bitmap', pixel: 4, threshold: 0.5, dither: 0.8, mode: 'noise', ink: '#1a0e00', paper: '#ffb000', midtone: true, mid: '#8a5a00', scroll: 16, invert: false };
    l.gradient.stops = stops(['#1a0e00', 0], ['#ffb000', 1]);
    l.gradient.type = 'radial';
    l.photo = { ...l.photo, blend: 0, contrast: 1.3, haze: 0, vignette: 0.4 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain.on = false;
  }),
];

const OMBRE_PRESETS: Look[] = [
  make('teal-monolith', 'Teal Monolith', (l) => {
    l.interact = { on: true, mode: 'orb', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: false };
    // dark teal room, cyan disc, almost monochrome
    l.gradient.type = 'radial';
    l.gradient.stops = stops(['#0a2a33', 0], ['#145c6b', 0.45], ['#2c9bb0', 0.8], ['#8fe3ee', 1]);
    l.gradient.warp = 0.35;
    l.gradient.scale = 1.2;
    l.gradient.flow = 0.6;
    l.photo = { ...l.photo, blend: 0.95, posterize: 6, contrast: 1.3, haze: 0.3, hazeHeight: 0.6, vignette: 0.45 };
    l.orb = { on: true, x: 0.5, y: 0.55, radius: 0.3, softness: 0.004, colorPos: 0.8, glow: 0.15 };
    l.effects.waves = { on: true, amplitude: 0.012, frequency: 2, falloff: 0.9, cycles: 1 };
    l.effects.grain = { on: true, amount: 0.14, size: 1.2 };
  }),
  make('dune-dusk', 'Dune Dusk', (l) => {
    // pink dunes against deep blue, star overhead
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#1b1f6b', 0], ['#4a3fa3', 0.35], ['#c86d9e', 0.65], ['#ffb3a6', 0.85], ['#ffe2cf', 1]);
    l.gradient.warp = 0.5;
    l.gradient.scale = 1.4;
    l.photo = { ...l.photo, blend: 0.9, posterize: 5, contrast: 1.25, haze: 0.4, hazeHeight: 0.55, vignette: 0.2 };
    l.orb = { on: true, x: 0.56, y: 0.82, radius: 0.02, softness: 0.03, colorPos: 1, glow: 0.9 };
    l.effects.grain = { on: true, amount: 0.1, size: 1.4 };
  }),
  make('arch-pool', 'Arch Pool', (l) => {
    l.interact = { on: true, mode: 'orb', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: false };
    // cobalt walls, coral arch, pale moon
    l.gradient.type = 'mesh';
    l.gradient.stops = stops(['#0d1f7a', 0], ['#1f3fb3', 0.4], ['#ff6a4d', 0.72], ['#ffb089', 0.9], ['#ffe6d6', 1]);
    l.gradient.warp = 0.6;
    l.gradient.scale = 1.1;
    l.photo = { ...l.photo, blend: 0.85, posterize: 0, contrast: 1.15, haze: 0.35, hazeHeight: 0.5, vignette: 0.3 };
    l.orb = { on: true, x: 0.5, y: 0.7, radius: 0.07, softness: 0.006, colorPos: 1, glow: 0.35 };
    l.effects.waves = { on: true, amplitude: 0.03, frequency: 4, falloff: 0.1, cycles: 1 };
  }),
  make('ember-arches', 'Ember Arches', (l) => {
    // orange bridges, navy sky, golden sun
    l.gradient.type = 'linear';
    l.gradient.angle = 100;
    l.gradient.stops = stops(['#0e2340', 0], ['#2d3a5a', 0.3], ['#c8451f', 0.6], ['#ff8a2a', 0.8], ['#f6d47a', 1]);
    l.gradient.warp = 0.45;
    l.gradient.scale = 1.8;
    l.photo = { ...l.photo, blend: 0.92, posterize: 7, contrast: 1.3, haze: 0.25, hazeHeight: 0.45, vignette: 0.3 };
    l.orb = { on: true, x: 0.7, y: 0.6, radius: 0.22, softness: 0.01, colorPos: 1, glow: 0.3 };
    l.effects.waves.on = false;
  }),
  make('terracotta', 'Terracotta', (l) => {
    // flat poster orange with plum shadows
    l.gradient.type = 'linear';
    l.gradient.angle = 270;
    l.gradient.stops = stops(['#3d1030', 0], ['#8c2a4a', 0.3], ['#e85a3a', 0.6], ['#ff8a4a', 1]);
    l.gradient.warp = 0.15;
    l.gradient.scale = 2.2;
    l.gradient.flow = 0.4;
    l.photo = { ...l.photo, blend: 1, posterize: 4, contrast: 1.4, haze: 0.1, hazeHeight: 0.3, vignette: 0.05 };
    l.orb.on = false;
    l.effects.waves.on = false;
    l.effects.grain = { on: true, amount: 0.08, size: 1 };
  }),
  make('lavender-hour', 'Lavender Hour', (l) => {
    // lilac corridor, pink sun, soft steps
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#3a2a6e', 0], ['#7b5fb8', 0.4], ['#b79ad9', 0.7], ['#f1d8ea', 1]);
    l.gradient.warp = 0.3;
    l.gradient.scale = 1.3;
    l.photo = { ...l.photo, blend: 0.9, posterize: 6, contrast: 1.2, haze: 0.45, hazeHeight: 0.6, vignette: 0.15 };
    l.orb = { on: true, x: 0.3, y: 0.7, radius: 0.08, softness: 0.006, colorPos: 0.72, glow: 0.25 };
    l.effects.waves = { on: true, amplitude: 0.015, frequency: 2, falloff: 0.5, cycles: 1 };
  }),
  make('violet-vortex', 'Violet Vortex', (l) => {
    l.interact = { on: true, mode: 'warp', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: false };
    // dark violet sky, magenta swirl, orange core
    l.gradient.type = 'radial';
    l.gradient.stops = stops(['#120a2a', 0], ['#3b1466', 0.4], ['#b21ea8', 0.7], ['#ff5a3c', 0.92], ['#ffb15a', 1]);
    l.gradient.warp = 1.1;
    l.gradient.scale = 1;
    l.gradient.flow = 1.4;
    l.photo = { ...l.photo, blend: 0.9, posterize: 0, contrast: 1.2, haze: 0.5, hazeHeight: 0.7, vignette: 0.4 };
    l.orb = { on: true, x: 0.62, y: 0.42, radius: 0.16, softness: 0.08, colorPos: 0.95, glow: 0.6 };
    l.effects.waves = { on: true, amplitude: 0.06, frequency: 1.5, falloff: 0.2, cycles: 1 };
    l.effects.grain = { on: true, amount: 0.16, size: 1.3 };
  }),
  make('sodium-columns', 'Sodium Columns', (l) => {
    // amber columns receding into a blue-grey dusk
    l.gradient.type = 'linear';
    l.gradient.angle = 160;
    l.gradient.stops = stops(['#13203a', 0], ['#3a4660', 0.35], ['#c6531f', 0.65], ['#ffa21a', 0.85], ['#ffe08a', 1]);
    l.gradient.warp = 0.4;
    l.gradient.scale = 1.6;
    l.photo = { ...l.photo, blend: 0.95, posterize: 8, contrast: 1.35, haze: 0.3, hazeHeight: 0.5, vignette: 0.35 };
    l.orb = { on: true, x: 0.12, y: 0.55, radius: 0.28, softness: 0.004, colorPos: 0.88, glow: 0.2 };
    l.effects.waves.on = false;
  }),
  make('neon-pyramid', 'Neon Pyramid', (l) => {
    // bubblegum pink over electric blue, hard horizon
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#0b1d5c', 0], ['#2a4fd6', 0.3], ['#7a5ad6', 0.55], ['#ff7ad9', 0.8], ['#ffc6f0', 1]);
    l.gradient.warp = 0.35;
    l.gradient.scale = 1.5;
    l.photo = { ...l.photo, blend: 0.9, posterize: 5, contrast: 1.3, haze: 0.3, hazeHeight: 0.5, vignette: 0.2 };
    l.orb = { on: true, x: 0.68, y: 0.6, radius: 0.14, softness: 0.05, colorPos: 1, glow: 0.5 };
    l.effects.waves = { on: true, amplitude: 0.02, frequency: 6, falloff: 0.9, cycles: 2 };
  }),
  make('noir-arcade', 'Noir Arcade', (l) => {
    // black and white arches, water, long shadows
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#050505', 0], ['#2a2a2c', 0.4], ['#8f9094', 0.75], ['#e9e8e4', 1]);
    l.gradient.warp = 0.5;
    l.gradient.scale = 1.2;
    l.gradient.flow = 0.5;
    l.photo = { ...l.photo, blend: 1, posterize: 0, contrast: 1.45, exposure: -0.05, haze: 0.2, hazeHeight: 0.4, vignette: 0.5 };
    l.orb.on = false;
    l.effects.waves = { on: true, amplitude: 0.02, frequency: 3, falloff: 0, cycles: 1 };
    l.effects.grain = { on: true, amount: 0.2, size: 1.3 };
  }),
  make('snow-lilac', 'Snow Lilac', (l) => {
    // white dunes, pink sky, one purple sphere
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#4b2fa6', 0], ['#b9c4ea', 0.25], ['#eef0f8', 0.6], ['#f6c9d6', 0.85], ['#ffd9b8', 1]);
    l.gradient.warp = 0.3;
    l.gradient.scale = 1.4;
    l.photo = { ...l.photo, blend: 0.8, posterize: 0, contrast: 1.1, exposure: 0.1, haze: 0.4, hazeHeight: 0.5, vignette: 0.1 };
    l.orb = { on: true, x: 0.28, y: 0.22, radius: 0.04, softness: 0.004, colorPos: 0, glow: 0.1 };
    l.effects.waves = { on: true, amplitude: 0.012, frequency: 3, falloff: 0.8, cycles: 1 };
    l.effects.grain = { on: true, amount: 0.07, size: 1.4 };
  }),
  make('glacier', 'Glacier', (l) => {
    // ultramarine ridges, cyan light on the facets
    l.gradient.type = 'mesh';
    l.gradient.stops = stops(['#1c1a8a', 0], ['#3a3fd0', 0.4], ['#4fa3ff', 0.75], ['#9df1ff', 1]);
    l.gradient.warp = 0.7;
    l.gradient.scale = 1.3;
    l.photo = { ...l.photo, blend: 0.95, posterize: 7, contrast: 1.25, haze: 0.35, hazeHeight: 0.6, vignette: 0.25 };
    l.orb.on = false;
    l.effects.waves = { on: true, amplitude: 0.025, frequency: 2.5, falloff: 0.6, cycles: 1 };
  }),
  make('acid-ridge', 'Acid Ridge', (l) => {
    // teal sky into lime and yellow ridges
    l.gradient.type = 'linear';
    l.gradient.angle = 90;
    l.gradient.stops = stops(['#0b5f6a', 0], ['#128c7a', 0.35], ['#4fd26a', 0.65], ['#d8ff3a', 0.88], ['#fff08a', 1]);
    l.gradient.warp = 0.6;
    l.gradient.scale = 1.5;
    l.gradient.flow = 1.2;
    l.photo = { ...l.photo, blend: 0.95, posterize: 6, contrast: 1.3, haze: 0.3, hazeHeight: 0.55, vignette: 0.2 };
    l.orb.on = false;
    l.effects.waves = { on: true, amplitude: 0.035, frequency: 3, falloff: 0.3, cycles: 1 };
  }),
  make('magenta-haze', 'Magenta Haze', (l) => {
    l.interact = { on: true, mode: 'light', strength: 0.4, radius: 0.5, follow: 0.4, fadeIdle: false };
    // pink fog, dark dunes, floating glass shapes
    l.gradient.type = 'mesh';
    l.gradient.stops = stops(['#1a1a3a', 0], ['#5a3a9a', 0.3], ['#e8408a', 0.6], ['#ff6ea8', 0.8], ['#ffd1ea', 1]);
    l.gradient.warp = 0.9;
    l.gradient.scale = 1.1;
    l.gradient.flow = 1.1;
    l.photo = { ...l.photo, blend: 0.85, posterize: 0, contrast: 1.15, haze: 0.55, hazeHeight: 0.75, vignette: 0.3 };
    l.orb = { on: true, x: 0.45, y: 0.55, radius: 0.09, softness: 0.1, colorPos: 0.85, glow: 0.5 };
    l.effects.grain = { on: true, amount: 0.15, size: 1.2 };
  }),
];

export const BUILT_IN_PRESETS: Look[] = [...PATTERN_PRESETS, ...OMBRE_PRESETS];
