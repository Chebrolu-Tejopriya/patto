import { MAX_STOPS, type BgMode, type DitherMode, type GradientType, type InteractMode, type Pattern, type PatternType, type Shape } from '../model/look';
import { sizeForImage, useStore } from '../store';
import { Section, Seg, Slider, Toggle } from './controls';
import { ExportMenu } from './ExportMenu';


// ---- Pattern technique control tables -------------------------------------
type NumKey = { [K in keyof Pattern]: Pattern[K] extends number ? K : never }[keyof Pattern];
type ColorKey = 'ink' | 'paper' | 'mid';
type SliderDef = { key: NumKey; label: string; min: number; max: number; step?: number; fmt?: (v: number) => string };

const px = (v: number) => v + 'px';
const deg = (v: number) => v + '\u00b0';
const cells = (v: number) => v + (v === 1 ? ' cell' : ' cells');
const S = {
  pixel: (label = 'Cell', min = 2, max = 48): SliderDef => ({ key: 'pixel', label, min, max, step: 1, fmt: px }),
  threshold: (label = 'Threshold', min = 0, max = 1): SliderDef => ({ key: 'threshold', label, min, max }),
  dither: (label = 'Dither', max = 1.5): SliderDef => ({ key: 'dither', label, min: 0, max }),
  angle: (label = 'Angle'): SliderDef => ({ key: 'angle', label, min: -90, max: 90, step: 1, fmt: deg }),
  gap: (label = 'Gap'): SliderDef => ({ key: 'gap', label, min: 0, max: 1 }),
  shade: (label = 'Shade'): SliderDef => ({ key: 'shade', label, min: 0, max: 1 }),
  breathe: (label = 'Breathe'): SliderDef => ({ key: 'breathe', label, min: 0, max: 1 }),
  depth: (label = 'Depth', max = 8): SliderDef => ({ key: 'depth', label, min: 1, max, step: 1, fmt: cells }),
  tilt: (label = 'Tilt'): SliderDef => ({ key: 'tilt', label, min: -80, max: 80, step: 1, fmt: deg }),
  follow: (): SliderDef => ({ key: 'depth', label: 'Follow form', min: 1, max: 8, step: 1, fmt: (v) => Math.round(((v - 1) / 7) * 100) + '%' }),
  layers: (): SliderDef => ({ key: 'depth', label: 'Layers', min: 1, max: 8, step: 1, fmt: (v) => v + 1 + ' layers' }),
  levels: (): SliderDef => ({ key: 'depth', label: 'Levels', min: 1, max: 8, step: 1, fmt: (v) => v + 2 + ' levels' }),
  scroll: (label = 'Scroll'): SliderDef => ({ key: 'scroll', label, min: 0, max: 16, step: 1, fmt: (v) => (v ? cells(v) : 'still') }),
};

const TECH_ORDER: PatternType[] = ['none', 'tiles', 'cells', 'stitch', 'hatch', 'voxel', 'split', 'blocks', 'glyph', 'soft', 'riso', 'papercut', 'print', 'halftone', 'bitmap', 'ascii', 'mosaic', 'glitch'];

// per-technique mode switch, stored in `shape`
const TECH_MODES: Partial<Record<PatternType, [Shape, string][]>> = {
  hatch: [['dot', 'tone'], ['square', 'dash'], ['diamond', 'line art']],
  riso: [['dot', 'plates'], ['square', 'line raster']],
  soft: [['dot', 'blur'], ['square', 'glass']],
  ascii: [['dot', 'glyphs'], ['square', 'words']],
  voxel: [['dot', 'height'], ['square', 'slab']],
  split: [['dot', 'half pixel'], ['square', 'cut-out']],
};
const TECH_LABEL: Record<PatternType, string> = {
  none: 'None', tiles: 'Mosaic', cells: 'Cells', split: 'Split', blocks: 'Blocks', glyph: 'Glyphs', bitmap: 'Bitmap', halftone: 'Halftone', print: 'Print', ascii: 'ASCII', stitch: 'Stitch', hatch: 'Engrave', riso: 'Riso', papercut: 'Paper cut', voxel: 'Voxel', mosaic: 'Shards', glitch: 'Glitch', soft: 'Airbrush',
};
const TECH_HINT: Record<PatternType, string> = {
  none: '',
  cells: 'Tone levels each own a mark (dot, plus, ring, disc, square, half, fill) in the image colour; density gradients come from ordered dither between levels.',
  split: 'Half pixel: part of the subject becomes flat pixels along a straight edge. Cut-out: a blocky silhouette, photo inside, paper outside.',
  blocks: 'Rounded blocks of several sizes with a vertical gradient each, outline echoes in the background, no shadows.',
  glyph: 'A flower glyph where the subject is dark, a dot where it is light. With the trail cursor mode the pointer paints flowers that fade.',
  tiles: 'Irregular translucent tiles over the thick parts of the subject only, with a soft shadow copy beneath. Thin features and the background stay as they are.',
  bitmap: '1-bit ordered dither, like early Mac and handheld screens.',
  halftone: 'Dots on a rotated grid grow with tone. Square on dark reads as an LED matrix.',
  ascii: 'A glyph ramp picked by tone, drawn with a built-in 5x7 font.',
  stitch: 'Cross-stitch threads on aida fabric; light areas stay as fabric.',
  hatch: 'Engraving strokes that follow the contours of the image and cross in the shadows.',
  riso: 'Spot-ink plates printed slightly out of register on textured paper.',
  papercut: 'Tone sliced into flat card layers with a soft shadow between each.',
  print: 'Process-colour halftone screens at real press angles, with dot gain.',
  voxel: 'Bright areas rise as stacked blocks; dark areas become sky.',
  mosaic: 'Bevelled pixel tiles; a share of tiles drift out of the grid.',
  glitch: 'Banded slips, chunky blocks and chroma split, stepping 12 states per loop.',
  soft: 'Airbrushed blur on a flat wash, with bloom and soft tonal bands. Add grain for the poster look.',
};
const TECH_SWATCHES: Record<PatternType, [ColorKey, string][]> = {
  none: [],
  cells: [['ink', 'Dark'], ['mid', 'Mid'], ['paper', 'Light / base']],
  split: [['paper', 'Paper']],
  blocks: [['paper', 'Paper']],
  glyph: [['ink', 'Ink'], ['mid', 'Ink 2'], ['paper', 'Paper']],
  tiles: [['paper', 'Paper']],
  bitmap: [['ink', 'Ink'], ['paper', 'Paper'], ['mid', 'Mid']],
  halftone: [['ink', 'Dot'], ['paper', 'Paper']],
  ascii: [['ink', 'Text'], ['paper', 'Screen']],
  stitch: [['ink', 'Thread'], ['mid', 'Thread 2'], ['paper', 'Fabric']],
  hatch: [['ink', 'Ink'], ['paper', 'Paper']],
  riso: [['ink', 'Ink'], ['mid', 'Ink 2'], ['paper', 'Paper']],
  papercut: [['ink', 'Bottom'], ['mid', 'Middle'], ['paper', 'Top']],
  print: [['ink', 'Key'], ['paper', 'Paper']],
  voxel: [['paper', 'Sky'], ['ink', 'Shadow']],
  mosaic: [['paper', 'Ground'], ['ink', 'Dark']],
  glitch: [['mid', 'Accent']],
  soft: [['paper', 'Wash']],
};
const TECH_KEEP = new Set<PatternType>(['halftone', 'print', 'ascii', 'stitch', 'hatch', 'riso', 'papercut', 'mosaic', 'cells', 'glyph', 'voxel']);
const TECH_SLIDERS: Record<PatternType, SliderDef[]> = {
  none: [],
  cells: [S.pixel('Cell', 3, 40), { key: 'depth', label: 'Levels', min: 1, max: 7, step: 1, fmt: (v) => v + 1 + ' levels' }, S.threshold('Tone'), S.dither('Blend', 1), S.gap('Mark size'), S.shade('Dropout'), S.breathe('Pulse')],
  split: [S.pixel('Pixel', 4, 80), S.angle('Edge angle'), S.threshold('Edge'), S.dither('Palette', 1), S.breathe('Drift')],
  blocks: [S.pixel('Block', 8, 80), { key: 'depth', label: 'Echoes', min: 0, max: 6, step: 1, fmt: (v) => (v ? v + ' cells' : 'off') }, S.shade('Gradient'), S.dither('Palette', 1)],
  glyph: [S.pixel('Cell', 8, 48), S.threshold('Tone'), S.dither('Contrast'), S.gap('Size')],
  tiles: [S.pixel('Tile', 6, 60), S.gap('Variety'), S.shade('Irregular'), S.dither('Palette', 1), { key: 'depth', label: 'Shadow', min: 0, max: 8, step: 1, fmt: (v) => (v ? cells(v) : 'off') }, S.tilt('Shadow angle'), S.breathe('Pulse')],
  bitmap: [S.pixel('Pixel', 1, 24), S.threshold(), S.dither(), S.scroll()],
  halftone: [S.pixel('Cell', 3, 40), S.angle(), S.threshold('Tone'), S.dither('Contrast'), S.gap('Spacing'), S.shade('Show photo'), S.breathe('Pulse')],
  ascii: [S.pixel('Glyph', 6, 40), S.threshold('Tone'), S.dither('Contrast'), S.breathe('Flicker')],
  stitch: [S.pixel('Stitch', 6, 40), S.threshold('Coverage'), S.dither('Palette', 1.5), S.gap('Thread'), S.shade('Relief')],
  hatch: [S.pixel('Spacing', 3, 24), S.follow(), S.angle(), S.threshold('Tone'), S.dither('Contrast'), S.gap('Breaks'), S.shade('Wobble'), S.scroll('Glide')],
  riso: [S.threshold('Tone'), S.dither('Softness', 1), S.gap('Misregister'), S.shade('Ink density'), S.levels(), S.breathe('Wobble')],
  papercut: [S.layers(), S.angle('Light'), S.gap('Shadow'), S.shade('Depth'), S.threshold('Tone'), S.breathe('Pulse')],
  print: [S.pixel('Screen', 3, 30), S.angle(), S.threshold('Tone'), S.dither('Dot gain', 1), S.shade('Black plate'), S.gap('Misregister'), S.breathe('Pulse')],
  voxel: [S.pixel('Block', 6, 48), S.threshold('Cutoff', 0, 0.95), S.depth(), S.tilt(), S.shade(), S.gap('Outline'), S.breathe()],
  mosaic: [S.pixel('Tile', 6, 48), S.threshold('Cutoff', 0, 0.95), S.gap('Scatter'), S.depth('Reach'), S.shade('Bevel'), S.breathe('Drift')],
  glitch: [S.pixel('Grain', 2, 24), S.threshold('Amount'), S.dither('Slip'), S.shade('Chroma'), S.gap('Scanlines'), S.breathe('Wobble')],
  soft: [S.pixel('Blur', 2, 120), S.shade('Mix'), S.gap('Wash / halo'), { key: 'depth', label: 'Bloom / tile', min: 1, max: 8, step: 1 }, S.dither('Bands', 1), S.breathe('Pulse')],
};

const SIZES: Record<string, [number, number]> = {
  '16:9 1080p': [1920, 1080],
  '16:9 4K': [3840, 2160],
  '9:16 Story': [1080, 1920],
  '1:1 Square': [1080, 1080],
  '4:5 Post': [1080, 1350],
  '21:9 Wide': [2520, 1080],
};

export function Inspector() {
  const look = useStore((s) => s.look);
  const update = useStore((s) => s.update);
  const randomize = useStore((s) => s.randomize);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const g = look.gradient;
  const e = look.effects;
  const ph = look.photo;
  const o = look.orb;
  const pt = look.pattern;
  const it = look.interact;
  const photo = useStore((s) => s.photo);
  const imgSize = photo ? sizeForImage(photo.bitmap.width, photo.bitmap.height) : null;
  const matchesImage = !!imgSize && imgSize.w === look.size.w && imgSize.h === look.size.h;
  const sizeKey = matchesImage ? 'Match image' : (Object.keys(SIZES).find((k) => SIZES[k][0] === look.size.w && SIZES[k][1] === look.size.h) ?? 'custom');

  return (
    <aside className="panel inspector">
      <div className="topbar">
        <button className="mini" onClick={() => setPlaying(!playing)} title="Space">
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <ExportMenu />
      </div>
      <Section title="Look">
        <input
          className="name"
          value={look.name}
          onChange={(ev) => update((l) => (l.name = ev.target.value))}
          placeholder="Name"
        />
        <label className="row">
          <span>Canvas</span>
          <select
            value={sizeKey}
            onChange={(ev) => {
              if (ev.target.value === 'Match image' && imgSize) {
                update((l) => (l.size = { ...imgSize }));
                return;
              }
              const s = SIZES[ev.target.value];
              if (s) update((l) => (l.size = { w: s[0], h: s[1] }));
            }}
          >
            {imgSize && <option value="Match image">Match image ({imgSize.w}×{imgSize.h})</option>}
            {sizeKey === 'custom' && <option value="custom">{look.size.w}×{look.size.h}</option>}
            {Object.keys(SIZES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section
        title="Ombre"
        right={
          <button className="mini" onClick={randomize} title="Randomise colours and flow">
            Shuffle
          </button>
        }
      >
        <Seg<GradientType> value={g.type} options={['mesh', 'linear', 'radial']} onChange={(v) => update((l) => (l.gradient.type = v))} />
        <div className="stops">
          <div
            className="ramp"
            style={{
              background: `linear-gradient(90deg, ${[...g.stops]
                .sort((a, b) => a.pos - b.pos)
                .map((s) => `${s.color} ${Math.round(s.pos * 100)}%`)
                .join(', ')})`,
            }}
          />
          {g.stops.map((s, i) => (
            <div className="stop" key={i}>
              <input type="color" value={s.color} onChange={(ev) => update((l) => (l.gradient.stops[i].color = ev.target.value))} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={s.pos}
                onChange={(ev) => update((l) => (l.gradient.stops[i].pos = +ev.target.value))}
              />
              <button
                className="x"
                disabled={g.stops.length <= 2}
                onClick={() => update((l) => l.gradient.stops.splice(i, 1))}
                title="Remove stop"
              >
                ×
              </button>
            </div>
          ))}
          {g.stops.length < MAX_STOPS && (
            <button
              className="mini"
              onClick={() =>
                update((l) => {
                  const last = l.gradient.stops[l.gradient.stops.length - 1];
                  l.gradient.stops.push({ color: last.color, pos: Math.min(1, last.pos + 0.1) });
                })
              }
            >
              + Add stop
            </button>
          )}
        </div>
        {g.type === 'linear' && <Slider label="Angle" value={g.angle} min={0} max={360} step={1} onChange={(v) => update((l) => (l.gradient.angle = v))} />}
        <Slider label="Warp" value={g.warp} min={0} max={1.5} onChange={(v) => update((l) => (l.gradient.warp = v))} />
        <Slider label="Scale" value={g.scale} min={0.3} max={5} onChange={(v) => update((l) => (l.gradient.scale = v))} />
        <Slider label="Flow" value={g.flow} min={0} max={3} onChange={(v) => update((l) => (l.gradient.flow = v))} />
        <Slider label="Seed" value={g.seed} min={0} max={999} step={1} onChange={(v) => update((l) => (l.gradient.seed = v))} />
      </Section>

      <Section title="Cursor" right={<Toggle label="" value={it.on} onChange={(v) => update((l) => (l.interact.on = v))} />}>
        <Seg<InteractMode> value={it.mode} options={['warp', 'light', 'orb', 'focus', 'trail']} onChange={(v) => update((l) => (l.interact.mode = v))} />
        <p className="hint small">
          {it.mode === 'warp' && 'The ombre field drifts toward the pointer with a gentle bend.'}
          {it.mode === 'light' && 'A soft wash of the ramp colour follows the pointer.'}
          {it.mode === 'orb' && 'The orb follows the pointer (turn the orb on).'}
          {it.mode === 'focus' && 'Bitmap cells step finer under the pointer.'}
          {it.mode === 'trail' && 'The pointer paints marks that slowly fade (glyph field, cell mosaics).'}
        </p>
        <Slider label="Strength" value={it.strength} min={0} max={1} onChange={(v) => update((l) => (l.interact.strength = v))} />
        <Slider label="Radius" value={it.radius} min={0.05} max={1} onChange={(v) => update((l) => (l.interact.radius = v))} />
        <Slider label="Follow" value={it.follow} min={0.02} max={1} fmt={(v) => (v < 0.25 ? 'lazy' : v < 0.6 ? 'smooth' : v < 0.9 ? 'quick' : 'snappy')} onChange={(v) => update((l) => (l.interact.follow = v))} />
        <Toggle label="Fade when idle" value={it.fadeIdle} onChange={(v) => update((l) => (l.interact.fadeIdle = v))} />
      </Section>

      <Section title="Pattern">
        <div className="techs">
          {TECH_ORDER.map((t) => (
            <button key={t} className={pt.type === t ? 'on' : ''} onClick={() => update((l) => (l.pattern.type = t))}>
              {TECH_LABEL[t]}
            </button>
          ))}
        </div>
        {pt.type !== 'none' && (
          <>
            <p className="hint small">{TECH_HINT[pt.type]}</p>
            {pt.type === 'bitmap' && (
              <Seg<DitherMode> value={pt.mode} options={['bayer4', 'bayer8', 'lines', 'noise']} onChange={(v) => update((l) => (l.pattern.mode = v))} />
            )}
            {pt.type === 'halftone' && (
              <Seg<Shape> value={pt.shape} options={['dot', 'square', 'diamond', 'ring']} onChange={(v) => update((l) => (l.pattern.shape = v))} />
            )}
            {TECH_MODES[pt.type] && (
              <div className="seg">
                {TECH_MODES[pt.type]!.map(([val, label]) => (
                  <button key={val} className={pt.shape === val ? 'on' : ''} onClick={() => update((l) => (l.pattern.shape = val))}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {pt.type === 'cells' && (
              <label className="marks">
                <span>Marks per level</span>
                <input value={pt.marks} onChange={(ev) => update((l) => (l.pattern.marks = ev.target.value))} spellCheck={false} />
                <small>none, dot, plus, ring, disc, square, xsquare, half, fill, dotscreen, screen, x, grid, stipple</small>
              </label>
            )}
            {pt.type === 'cells' && (
              <label className="marks">
                <span>Ground mark</span>
                <input value={pt.ground ?? 'none'} onChange={(ev) => update((l) => (l.pattern.ground = ev.target.value))} spellCheck={false} />
                <small>one mark tiled over the background, or none</small>
              </label>
            )}
            <div className="inks">
              {TECH_SWATCHES[pt.type].map(([key, label]) => (
                <label key={key} className={key === 'mid' && pt.type === 'bitmap' && !pt.midtone ? 'dim' : ''}>
                  <input type="color" value={pt[key]} onChange={(ev) => update((l) => (l.pattern[key] = ev.target.value))} />
                  <span>{label}</span>
                </label>
              ))}
              {pt.type === 'bitmap' && <Toggle label="3 tone" value={pt.midtone} onChange={(v) => update((l) => (l.pattern.midtone = v))} />}
              {TECH_KEEP.has(pt.type) && <Toggle label="Image colours" value={pt.keep} onChange={(v) => update((l) => (l.pattern.keep = v))} />}
            </div>
            {TECH_SLIDERS[pt.type].map((c) => (
              <Slider key={c.key} label={c.label} value={pt[c.key]} min={c.min} max={c.max} step={c.step ?? 0.01} fmt={c.fmt} onChange={(v) => update((l) => ((l.pattern[c.key] as number) = v))} />
            ))}
            <Toggle label="Invert" value={pt.invert} onChange={(v) => update((l) => (l.pattern.invert = v))} />
            <p className="hint small" style={{ marginTop: 10 }}>Subject. With a flat background the pattern is applied to the subject only.</p>
            <Toggle label="Subject only" value={pt.subject} onChange={(v) => update((l) => (l.pattern.subject = v))} />
            {pt.subject && (
              <>
                <Slider label="Tolerance" value={pt.tolerance} min={0} max={0.6} fmt={(v) => (v > 0 ? v.toFixed(2) : 'auto')} onChange={(v) => update((l) => (l.pattern.tolerance = v))} />
                <Slider label="Keep thin" value={pt.thin} min={0} max={40} step={1} fmt={(v) => (v ? v + 'px' : 'off')} onChange={(v) => update((l) => (l.pattern.thin = v))} />
                <Seg<BgMode> value={pt.bgMode} options={['keep', 'paper']} onChange={(v) => update((l) => (l.pattern.bgMode = v))} />
              </>
            )}
          </>
        )}
      </Section>

      {photo && (
        <Section title="Photo">
          <Seg<'cover' | 'contain'> value={ph.fit} options={['cover', 'contain']} onChange={(v) => update((l) => (l.photo.fit = v))} />
          <Slider label="Grade" value={ph.blend} min={0} max={1} onChange={(v) => update((l) => (l.photo.blend = v))} />
          <Slider label="Posterize" value={ph.posterize} min={0} max={12} step={1} fmt={(v) => (v ? `${v} lv` : 'off')} onChange={(v) => update((l) => (l.photo.posterize = v))} />
          <Slider label="Exposure" value={ph.exposure} min={-0.6} max={0.6} onChange={(v) => update((l) => (l.photo.exposure = v))} />
          <Slider label="Contrast" value={ph.contrast} min={0.5} max={2.2} onChange={(v) => update((l) => (l.photo.contrast = v))} />
          <Slider label="Haze" value={ph.haze} min={0} max={1} onChange={(v) => update((l) => (l.photo.haze = v))} />
          <Slider label="Haze height" value={ph.hazeHeight} min={0.05} max={1} onChange={(v) => update((l) => (l.photo.hazeHeight = v))} />
          <Slider label="Vignette" value={ph.vignette} min={0} max={1} onChange={(v) => update((l) => (l.photo.vignette = v))} />
        </Section>
      )}

      <Section title="Orb" right={<Toggle label="" value={o.on} onChange={(v) => update((l) => (l.orb.on = v))} />}>
        <Slider label="X" value={o.x} min={0} max={1} onChange={(v) => update((l) => (l.orb.x = v))} />
        <Slider label="Y" value={o.y} min={0} max={1} onChange={(v) => update((l) => (l.orb.y = v))} />
        <Slider label="Radius" value={o.radius} min={0.01} max={0.6} onChange={(v) => update((l) => (l.orb.radius = v))} />
        <Slider label="Softness" value={o.softness} min={0.001} max={0.3} step={0.001} onChange={(v) => update((l) => (l.orb.softness = v))} />
        <Slider label="Colour" value={o.colorPos} min={0} max={1} onChange={(v) => update((l) => (l.orb.colorPos = v))} />
        <Slider label="Glow" value={o.glow} min={0} max={1.5} onChange={(v) => update((l) => (l.orb.glow = v))} />
      </Section>

      {!photo && (
        <Section title="Vignette">
          <Slider label="Amount" value={ph.vignette} min={0} max={1} onChange={(v) => update((l) => (l.photo.vignette = v))} />
        </Section>
      )}

      <Section title="Waves" right={<Toggle label="" value={e.waves.on} onChange={(v) => update((l) => (l.effects.waves.on = v))} />}>
        <Slider label="Amplitude" value={e.waves.amplitude} min={0} max={0.2} step={0.001} onChange={(v) => update((l) => (l.effects.waves.amplitude = v))} />
        <Slider label="Frequency" value={e.waves.frequency} min={0.5} max={10} onChange={(v) => update((l) => (l.effects.waves.frequency = v))} />
        <Slider label="Falloff" value={e.waves.falloff} min={0} max={1} onChange={(v) => update((l) => (l.effects.waves.falloff = v))} />
        <Slider label="Cycles / loop" value={e.waves.cycles} min={1} max={4} step={1} onChange={(v) => update((l) => (l.effects.waves.cycles = v))} />
      </Section>

      <Section title="Grain" right={<Toggle label="" value={e.grain.on} onChange={(v) => update((l) => (l.effects.grain.on = v))} />}>
        <Slider label="Amount" value={e.grain.amount} min={0} max={0.6} onChange={(v) => update((l) => (l.effects.grain.amount = v))} />
        <Slider label="Size" value={e.grain.size} min={0.5} max={6} step={0.1} onChange={(v) => update((l) => (l.effects.grain.size = v))} />
      </Section>

      <Section title="Motion">
        <Slider label="Loop" value={look.motion.loopSeconds} min={1} max={20} step={0.5} fmt={(v) => v + 's'} onChange={(v) => update((l) => (l.motion.loopSeconds = v))} />
        <Slider label="FPS" value={look.motion.fps} min={12} max={60} step={1} onChange={(v) => update((l) => (l.motion.fps = v))} />
      </Section>
    </aside>
  );
}
