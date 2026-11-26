import { Program, RenderTarget, makeQuad } from './gl';
import { BITMAP_FRAG, VOXEL_FRAG, BLIT_FRAG, GRADIENT_FRAG, GRAIN_FRAG, STYLIZE_FRAG, WAVES_FRAG } from './shaders';
import { hexToRgb, MAX_STOPS, type Look, type Pattern, type PatternType } from '../model/look';
import { ASCII_FRAG, GLITCH_FRAG, HALFTONE_FRAG, HATCH_FRAG, MOSAIC_FRAG, PAPERCUT_FRAG, PRINT_FRAG, RISO_FRAG, SOFT_FRAG, TILES_FRAG } from './techniques';
import { BLOCKS_FRAG, CELLS_FRAG, GLYPH_FRAG, SPLIT_FRAG, STITCH_FRAG } from './techniques2';

const TECH_SRC: Partial<Record<PatternType, string>> = {
  halftone: HALFTONE_FRAG,
  stitch: STITCH_FRAG,
  ascii: ASCII_FRAG,
  hatch: HATCH_FRAG,
  glitch: GLITCH_FRAG,
  mosaic: MOSAIC_FRAG,
  riso: RISO_FRAG,
  papercut: PAPERCUT_FRAG,
  print: PRINT_FRAG,
  tiles: TILES_FRAG,
  cells: CELLS_FRAG,
  split: SPLIT_FRAG,
  blocks: BLOCKS_FRAG,
  glyph: GLYPH_FRAG,
};

const MARK_IDS: Record<string, number> = { none: 0, dot: 1, plus: 2, ring: 3, disc: 4, square: 5, xsquare: 6, half: 7, fill: 8, dotscreen: 9, screen: 10, x: 11, grid: 12, stipple: 13 };
function parseMarks(s: string) {
  const out = new Int32Array(8);
  const parts = s.split(',').map((p) => p.trim().toLowerCase());
  for (let i = 0; i < 8; i++) out[i] = MARK_IDS[parts[Math.min(i, parts.length - 1)] ?? ''] ?? 0;
  return out;
}

// Browsers disagree on whether UNPACK_FLIP_Y_WEBGL applies to ImageBitmap uploads
// (Chrome ignores it). We upload a 1x2 probe once per context and read it back,
// then compensate in the shader so photos are upright everywhere: stage, thumbnails,
// exports and the review page all go through the same path.
let probeBitmap: ImageBitmap | null = null;
if (typeof document !== 'undefined') {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 2;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 1, 1); // top white
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 1, 1, 1); // bottom black
  createImageBitmap(c).then((b) => (probeBitmap = b)).catch(() => {});
}

export type Pointer = { x: number; y: number; presence: number }; // uv space, y up

// Renders a Look at a given loop phase into its canvas. The same class is used
// for the live stage and for offline export (one instance per export at the
// export resolution), so what you see is exactly what you get.
export class Renderer {
  gl: WebGL2RenderingContext;
  private quad: WebGLVertexArrayObject;
  private gradient: Program;
  private stylize: Program;
  private bitmap: Program;
  private voxel: Program;
  private techs: Partial<Record<PatternType, Program>> = {};
  private softProg: Program | null = null;
  private get soft() {
    return (this.softProg ??= new Program(this.gl, SOFT_FRAG));
  }
  private tech(type: PatternType) {
    const src = TECH_SRC[type];
    if (!src) return null;
    return (this.techs[type] ??= new Program(this.gl, src));
  }
  private rtC: RenderTarget;
  private waves: Program;
  private grain: Program;
  private blit: Program;
  private rtA: RenderTarget;
  private rtB: RenderTarget;
  private photoTex: WebGLTexture;
  private photoW = 0;
  private photoH = 0;
  private photoFlip = 0;
  private bg = { r: 1, g: 1, b: 1, tol: 0.15, ok: false };
  private flipChecked = false;
  /** Lower bound on the size scale (sizes are authored at 1080p). Thumbnails raise it so marks stay legible. */
  minScale = 0;
  private scaleFor(h: number) {
    return Math.max(h / 1080, this.minScale);
  }
  private colors = new Float32Array(MAX_STOPS * 3);
  private positions = new Float32Array(MAX_STOPS);
  canvas: HTMLCanvasElement | OffscreenCanvas;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, w: number, h: number) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.quad = makeQuad(gl);
    this.gradient = new Program(gl, GRADIENT_FRAG);
    this.stylize = new Program(gl, STYLIZE_FRAG);
    this.bitmap = new Program(gl, BITMAP_FRAG);
    this.voxel = new Program(gl, VOXEL_FRAG);
    this.waves = new Program(gl, WAVES_FRAG);
    this.grain = new Program(gl, GRAIN_FRAG);
    this.blit = new Program(gl, BLIT_FRAG);
    this.rtA = new RenderTarget(gl, w, h);
    this.rtB = new RenderTarget(gl, w, h);
    this.rtC = new RenderTarget(gl, w, h);
    this.photoTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.resize(w, h);
  }

  /** Upload (or clear) the photo this renderer styles. */
  setPhoto(img: ImageBitmap | HTMLImageElement | null) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
    if (!img) {
      this.photoW = this.photoH = 0;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      return;
    }
    if (!this.flipChecked && img instanceof ImageBitmap && probeBitmap) this.checkFlip();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this.photoW = img.width;
    this.photoH = img.height;
    this.estimateBackground(img);
  }

  /** Upload the probe with FLIP_Y and read texel (0,0). With a working flip the
   * bottom row of the source (black) lands there; if it is white the flag was ignored. */
  private checkFlip() {
    const gl = this.gl;
    this.flipChecked = true;
    const tex = gl.createTexture();
    const fb = gl.createFramebuffer();
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, probeBitmap!);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const px = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      this.photoFlip = px[0] > 127 ? 1 : 0;
    } catch {
      this.photoFlip = 0;
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
    }
  }

  /** Estimate the photo's background from its border: median colour, a tolerance
   * from the border spread, and whether the border is uniform enough to trust. */
  private estimateBackground(img: ImageBitmap | HTMLImageElement) {
    try {
      const n = 48;
      const c: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : document.createElement('canvas');
      c.width = n;
      c.height = n;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0, n, n);
      const d = ctx.getImageData(0, 0, n, n).data;
      const px: [number, number, number][] = [];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (x > 1 && x < n - 2 && y > 1 && y < n - 2) continue;
          const i = (y * n + x) * 4;
          px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]);
        }
      }
      const med = (k: number) => {
        const v = px.map((p) => p[k]).sort((a, b) => a - b);
        return v[v.length >> 1];
      };
      const r = med(0), g = med(1), b = med(2);
      let sum = 0, near = 0;
      for (const p of px) {
        const dist = Math.hypot(p[0] - r, p[1] - g, p[2] - b);
        sum += dist;
        if (dist < 0.15) near++;
      }
      const mean = sum / px.length;
      this.bg = { r, g, b, tol: Math.min(0.35, Math.max(0.1, 0.1 + 2 * mean)), ok: near / px.length > 0.6 };
    } catch {
      this.bg = { r: 1, g: 1, b: 1, tol: 0.15, ok: false };
    }
  }

  get hasPhoto() {
    return this.photoW > 0;
  }

  resize(w: number, h: number) {
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.rtA.resize(w, h);
    this.rtB.resize(w, h);
    this.rtC.resize(w, h);
  }

  private draw() {
    this.gl.bindVertexArray(this.quad);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private iAmt = 0;
  private iMode = 0;
  private iRadius = 0.3;
  private mouse = { x: 0.5, y: 0.5 };

  private common(p: Program, w: number, h: number, phase: number) {
    p.use();
    p.v2('u_res', w, h);
    p.f('u_phase', phase);
    p.v2('u_mouse', this.mouse.x, this.mouse.y);
    p.f('u_iAmt', this.iAmt);
    p.f('u_iRadius', this.iRadius);
    p.i('u_iMode', this.iMode);
  }

  /** Upload the shared technique uniforms (see techniques.ts TECH block). */
  private setTech(p: Program, pt: Pattern, h: number) {
    const s = this.scaleFor(h); // sizes are authored at 1080p height
    p.f('u_pixel', Math.max(1, pt.pixel * s));
    p.f('u_threshold', pt.threshold);
    p.f('u_dither', pt.dither);
    p.f('u_angle', (pt.angle * Math.PI) / 180);
    const ink = hexToRgb(pt.ink), paper = hexToRgb(pt.paper), mid = hexToRgb(pt.mid);
    this.gl.uniform3f(p.loc('u_ink'), ink[0], ink[1], ink[2]);
    this.gl.uniform3f(p.loc('u_paper'), paper[0], paper[1], paper[2]);
    this.gl.uniform3f(p.loc('u_mid'), mid[0], mid[1], mid[2]);
    p.f('u_keep', pt.keep ? 1 : 0);
    p.f('u_invert', pt.invert ? 1 : 0);
    p.f('u_scroll', Math.round(pt.scroll));
    p.f('u_depth', Math.max(1, Math.round(pt.depth)));
    p.f('u_tilt', (pt.tilt * Math.PI) / 180);
    p.f('u_shade', pt.shade);
    p.f('u_breathe', pt.breathe);
    p.f('u_gap', pt.gap);
    p.i('u_shape', pt.shape === 'dot' ? 0 : pt.shape === 'square' ? 1 : pt.shape === 'diamond' ? 2 : 3);
    p.f('u_thin', pt.thin * s);
    p.f('u_bgMode', pt.bgMode === 'paper' ? 1 : 0);
    const ml = p.loc('u_marks[0]') ?? p.loc('u_marks');
    if (ml) this.gl.uniform1iv(ml, parseMarks(pt.marks));
    p.i('u_ground', MARK_IDS[(pt.ground ?? 'none').trim().toLowerCase()] ?? 0);
  }

  /** phase in [0,1): position within the loop. frame: integer frame index (for grain). */
  render(look: Look, phase: number, frame = 0, pointer?: Pointer) {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    phase = phase - Math.floor(phase);

    // Cursor interaction. Only the live stage passes a pointer; thumbnails and exports do not.
    const it = look.interact;
    const active = !!pointer && it.on && pointer.presence > 0.001;
    this.iAmt = active ? it.strength * pointer!.presence : 0;
    this.iMode = it.mode === 'orb' ? 0 : it.mode === 'warp' ? 1 : it.mode === 'light' ? 2 : 3;
    this.iRadius = it.radius;
    if (pointer) this.mouse = { x: pointer.x, y: pointer.y };

    // Pass 1: gradient -> dst. After every pass we swap, so src holds the latest image.
    // Skipped when a covering photo with no haze hides it completely (stylize then never shows u_grad).
    let src = this.rtB;
    let dst = this.rtA;
    // the colour ramp is shared by every pass, so it is prepared even when the gradient pass is skipped
    const g = look.gradient;
    const n = Math.min(g.stops.length, MAX_STOPS);
    const sorted = [...g.stops].sort((a, b) => a.pos - b.pos).slice(0, n);
    for (let i = 0; i < n; i++) {
      const [r, gg, b] = hexToRgb(sorted[i].color);
      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = gg;
      this.colors[i * 3 + 2] = b;
      this.positions[i] = sorted[i].pos;
    }
    const gradientVisible = !this.hasPhoto || look.photo.haze > 0 || look.photo.fit === 'contain';
    if (gradientVisible) {
      dst.bind();
      this.common(this.gradient, w, h, phase);
      this.gradient.i('u_type', g.type === 'linear' ? 0 : g.type === 'radial' ? 1 : 2);
      this.uploadRamp(this.gradient, n);
      this.gradient.f('u_angle', (g.angle * Math.PI) / 180);
      this.gradient.f('u_warp', g.warp);
      this.gradient.f('u_scale', g.scale);
      this.gradient.f('u_flow', g.flow);
      this.gradient.f('u_seed', g.seed);
      this.draw();
    }
    // swap either way so later passes read the same target as before
    [src, dst] = [dst, src];

    // Pass 2: stylize (photo grading, fog, orb, vignette)
    dst.bind();
    this.common(this.stylize, w, h, phase);
    this.stylize.tex('u_grad', 0, src.tex);
    this.stylize.tex('u_photo', 1, this.photoTex);
    this.stylize.v2('u_photoSize', Math.max(1, this.photoW), Math.max(1, this.photoH));
    this.stylize.f('u_hasPhoto', this.hasPhoto ? 1 : 0);
    this.stylize.f('u_photoFlip', this.photoFlip);
    this.gl.uniform3f(this.stylize.loc('u_bg'), this.bg.r, this.bg.g, this.bg.b);
    this.stylize.f('u_bgTol', look.pattern.tolerance > 0 ? look.pattern.tolerance : this.bg.tol);
    this.stylize.f('u_subject', look.pattern.subject && this.hasPhoto && (this.bg.ok || look.pattern.tolerance > 0) ? 1 : 0);
    this.uploadRamp(this.stylize, n);
    const ph = look.photo;
    this.stylize.i('u_fit', ph.fit === 'contain' ? 1 : 0);
    this.stylize.f('u_blend', ph.blend);
    this.stylize.f('u_posterize', ph.posterize);
    this.stylize.f('u_exposure', ph.exposure);
    this.stylize.f('u_contrast', ph.contrast);
    this.stylize.f('u_haze', ph.haze);
    this.stylize.f('u_hazeHeight', ph.hazeHeight);
    this.stylize.f('u_vignette', ph.vignette);
    const o = look.orb;
    this.stylize.f('u_orbOn', o.on ? 1 : 0);
    if (this.iMode === 0 && this.iAmt > 0) {
      // orb mode: the orb follows the pointer
      this.stylize.v2('u_orbPos', o.x + (this.mouse.x - o.x) * this.iAmt, o.y + (this.mouse.y - o.y) * this.iAmt);
    } else {
      this.stylize.v2('u_orbPos', o.x, o.y);
    }
    this.stylize.f('u_orbRadius', o.radius);
    this.stylize.f('u_orbSoft', o.softness);
    this.stylize.f('u_orbColorPos', o.colorPos);
    this.stylize.f('u_orbGlow', o.glow);
    this.draw();
    [src, dst] = [dst, src];

    // Pass 3: pattern technique
    const pt = look.pattern;
    if (pt.type === 'bitmap') {
      dst.bind();
      this.common(this.bitmap, w, h, phase);
      this.bitmap.tex('u_image', 0, src.tex);
      // pixel size is specified at 1080p height so the look is resolution independent
      this.bitmap.f('u_pixel', Math.max(1, pt.pixel * this.scaleFor(h)));
      this.bitmap.f('u_threshold', pt.threshold);
      this.bitmap.f('u_dither', pt.dither);
      this.bitmap.i('u_mode', pt.mode === 'bayer4' ? 0 : pt.mode === 'bayer8' ? 1 : pt.mode === 'lines' ? 2 : 3);
      const ink = hexToRgb(pt.ink), paper = hexToRgb(pt.paper), mid = hexToRgb(pt.mid);
      this.gl.uniform3f(this.bitmap.loc('u_ink'), ink[0], ink[1], ink[2]);
      this.gl.uniform3f(this.bitmap.loc('u_paper'), paper[0], paper[1], paper[2]);
      this.gl.uniform3f(this.bitmap.loc('u_mid'), mid[0], mid[1], mid[2]);
      this.bitmap.f('u_midtone', pt.midtone ? 1 : 0);
      this.bitmap.f('u_scroll', pt.scroll);
      this.bitmap.f('u_invert', pt.invert ? 1 : 0);
      this.bitmap.f('u_thin', pt.thin * this.scaleFor(h));
      this.bitmap.f('u_bgMode', pt.bgMode === 'paper' ? 1 : 0);
      this.draw();
      [src, dst] = [dst, src];
    } else if (pt.type === 'voxel') {
      dst.bind();
      this.common(this.voxel, w, h, phase);
      this.voxel.tex('u_image', 0, src.tex);
      this.voxel.f('u_pixel', Math.max(2, pt.pixel * this.scaleFor(h)));
      this.voxel.f('u_threshold', pt.threshold);
      this.voxel.f('u_depth', Math.max(1, Math.round(pt.depth)));
      this.voxel.f('u_tilt', (pt.tilt * Math.PI) / 180);
      this.voxel.f('u_breathe', pt.breathe);
      this.voxel.f('u_shade', pt.shade);
      const ink = hexToRgb(pt.ink), paper = hexToRgb(pt.paper);
      this.gl.uniform3f(this.voxel.loc('u_ink'), ink[0], ink[1], ink[2]);
      this.gl.uniform3f(this.voxel.loc('u_paper'), paper[0], paper[1], paper[2]);
      this.voxel.f('u_invert', pt.invert ? 1 : 0);
      this.voxel.f('u_slab', pt.shape === 'square' ? 1 : 0);
      this.voxel.f('u_keep', pt.keep ? 1 : 0);
      this.voxel.f('u_gap', pt.gap);
      const vmid = hexToRgb(pt.mid);
      this.gl.uniform3f(this.voxel.loc('u_mid'), vmid[0], vmid[1], vmid[2]);
      this.voxel.f('u_thin', pt.thin * this.scaleFor(h));
      this.voxel.f('u_bgMode', pt.bgMode === 'paper' ? 1 : 0);
      this.draw();
      [src, dst] = [dst, src];
    } else if (pt.type === 'soft') {
      // two separable passes: src -> dst (horizontal), then dst + src -> rtC (vertical + combine)
      dst.bind();
      this.common(this.soft, w, h, phase);
      this.soft.tex('u_image', 0, src.tex);
      this.setTech(this.soft, pt, h);
      this.soft.i('u_pass', 0);
      this.soft.v2('u_dir', 1 / w, 0);
      this.draw();
      const spare = this.rtC;
      spare.bind();
      this.common(this.soft, w, h, phase);
      this.soft.tex('u_image', 0, dst.tex);
      this.soft.tex('u_orig', 1, src.tex);
      this.setTech(this.soft, pt, h);
      this.soft.i('u_pass', 1);
      this.soft.v2('u_dir', 0, 1 / h);
      this.draw();
      // rotate the spare target into the ping-pong chain
      this.rtC = src;
      src = spare;
    } else if (pt.type !== 'none' && this.tech(pt.type)) {
      const p = this.tech(pt.type)!;
      dst.bind();
      this.common(p, w, h, phase);
      p.tex('u_image', 0, src.tex);
      this.setTech(p, pt, h);
      this.draw();
      [src, dst] = [dst, src];
    }

    // Effect passes ping-pong between A and B.
    const e = look.effects;
    if (e.waves.on) {
      dst.bind();
      this.common(this.waves, w, h, phase);
      this.waves.tex('u_image', 0, src.tex);
      this.waves.f('u_amplitude', e.waves.amplitude);
      this.waves.f('u_frequency', e.waves.frequency);
      this.waves.f('u_falloff', e.waves.falloff);
      this.waves.f('u_cycles', Math.max(1, Math.round(e.waves.cycles)));
      this.draw();
      [src, dst] = [dst, src];
    }
    if (e.grain.on) {
      dst.bind();
      this.common(this.grain, w, h, phase);
      this.grain.tex('u_image', 0, src.tex);
      this.grain.f('u_amount', e.grain.amount);
      this.grain.f('u_size', e.grain.size);
      // grain seed cycles with the frame so the loop still closes
      this.grain.f('u_frameSeed', ((frame % 97) + 1) / 97);
      this.draw();
      [src, dst] = [dst, src];
    }

    // Final blit to the screen (framebuffer textures are y-up; canvas is too, so no flip)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    this.common(this.blit, w, h, phase);
    this.blit.tex('u_image', 0, src.tex);
    this.blit.f('u_flipY', 0);
    this.draw();
  }

  /** Free GPU resources. Pass loseContext=false when the canvas will be reused
   * (a lost context on a canvas stays lost for later getContext calls). */
  private uploadRamp(p: Program, n: number) {
    p.i('u_stopCount', n);
    p.v3a('u_colors', this.colors);
    p.fa('u_positions', this.positions);
  }

  dispose(loseContext = true) {
    this.rtA.dispose();
    this.rtB.dispose();
    this.gl.deleteTexture(this.photoTex);
    if (loseContext) this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// The live stage keeps one long-lived Renderer; a hot update of the engine would leave it running stale shaders. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
