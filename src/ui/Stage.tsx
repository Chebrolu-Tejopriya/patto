import { useEffect, useRef, useState } from 'react';
import { isAnimated, qualityScale } from '../engine/motion';
import { Renderer, type Pointer } from '../engine/renderer';
import { useStore } from '../store';

/** Live preview. Fits the look's aspect ratio inside the available area and
 * renders at device resolution, capped for performance. */
export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const look = useStore((s) => s.look);
  const playing = useStore((s) => s.playing);
  const photo = useStore((s) => s.photo);
  const setPhotoFile = useStore((s) => s.setPhotoFile);
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  // anything that must trigger a fresh frame bumps this; the loop renders only when it changed
  const dirty = useRef(true);
  const photoRef = useRef(photo);
  photoRef.current = photo;
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState<'fit' | 'fill' | '100'>('fit');
  const zoomRef = useRef<'fit' | 'fill' | '100'>('fit');
  zoomRef.current = zoom;
  const refit = useRef<() => void>(() => {});
  const lookRef = useRef(look);
  const playingRef = useRef(playing);
  lookRef.current = look;
  playingRef.current = playing;
  useEffect(() => {
    dirty.current = true;
  }, [look, playing, photo, quality]);

  // keep the live renderer's photo texture in sync with the store
  useEffect(() => {
    rendererRef.current?.setPhoto(photo?.bitmap ?? null);
  }, [photo]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    let r: Renderer;
    try {
      r = new Renderer(canvas, 2, 2);
    } catch (e) {
      wrap.textContent = (e as Error).message;
      return;
    }
    rendererRef.current = r;
    r.setPhoto(useStore.getState().photo?.bitmap ?? null);

    const fit = () => {
      const { w, h } = lookRef.current.size;
      if (zoomRef.current === '100') {
        // 100%: one export pixel per screen pixel, so marks read at their true size
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const cap = Math.sqrt(2_100_000 / (w * h));
        const k = Math.min(1, cap) * qualityScale(qualityRef.current);
        r.resize(w * k, h * k);
        dirty.current = true;
        return;
      }
      // fit: whole canvas visible with a margin; fill: the canvas covers the stage and is cropped
      const fill = zoomRef.current === 'fill';
      const bw = wrap.clientWidth - (fill ? 0 : 32);
      const bh = wrap.clientHeight - (fill ? 0 : 32);
      const s = fill ? Math.max(bw / w, bh / h) : Math.min(bw / w, bh / h);
      const cw = Math.max(1, Math.floor(w * s));
      const ch = Math.max(1, Math.floor(h * s));
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // cap live render at ~2.1MP so the UI stays smooth; export is full-res anyway
      const cap = Math.sqrt((2_100_000) / (cw * ch * dpr * dpr));
      const k = Math.min(1, cap) * dpr * qualityScale(qualityRef.current);
      r.resize(cw * k, ch * k);
      dirty.current = true;
    };
    refit.current = fit;
    fit();
    r.render(lookRef.current, 0, 0); // first frame immediately, no black flash
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    // no frames while the stage is scrolled out of view (rAF already stops in hidden tabs)
    let visible = true;
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible) dirty.current = true;
    });
    io.observe(wrap);

    // pointer: target from events, smoothed value sent to the renderer
    const target = { x: 0.5, y: 0.5, inside: false };
    const ptr: Pointer = { x: 0.5, y: 0.5, presence: 0 };
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      target.x = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
      target.y = 1 - Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
      target.inside = true;
      dirty.current = true;
    };
    const onLeave = () => {
      target.inside = false;
      dirty.current = true;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = 0;
    let t0 = performance.now();
    let paused = 0; // accumulated pause offset
    let pauseStart = 0;
    let lastSize = `${lookRef.current.size.w}x${lookRef.current.size.h}`;
    let trailFrames = 0; // frames left for a trail to fade after the pointer goes idle
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const l = lookRef.current;
      const sz = `${l.size.w}x${l.size.h}`;
      if (sz !== lastSize) {
        lastSize = sz;
        fit();
      }
      if (!playingRef.current) {
        if (!pauseStart) pauseStart = now;
      } else if (pauseStart) {
        paused += now - pauseStart;
        pauseStart = 0;
      }
      const t = ((pauseStart || now) - t0 - paused) / 1000;
      const phase = (t / l.motion.loopSeconds) % 1;
      const frame = Math.floor(t * l.motion.fps);

      // Pointer damping, frame-rate independent: k = 1 - exp(-dt * rate).
      // The same k eases position and presence, so entering and leaving feel symmetric.
      // `follow` 0..1 maps to a rate of 2..16 per second (Originkit uses 8).
      const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
      last = now;
      const it = l.interact;
      const rate = 2 + it.follow * 14;
      const k = 1 - Math.exp(-dt * rate);
      // when the pointer leaves, the origin walks back to centre (unless fading)
      const home = !target.inside && !it.fadeIdle;
      const tx = home ? 0.5 : target.x;
      const ty = home ? 0.5 : target.y;
      ptr.x += (tx - ptr.x) * k;
      ptr.y += (ty - ptr.y) * k;
      const wantPresence = it.on && (target.inside || !it.fadeIdle) ? 1 : 0;
      ptr.presence += (wantPresence - ptr.presence) * k;

      // Render on demand: only when the look animates on its own, the pointer is still easing,
      // a trail is fading, or something marked the frame dirty. Static looks cost zero frames.
      const settling = Math.abs(ptr.x - tx) > 0.0005 || Math.abs(ptr.y - ty) > 0.0005 || Math.abs(ptr.presence - wantPresence) > 0.002;
      if (it.on && it.mode === 'trail' && ptr.presence > 0.001) trailFrames = 240;
      else if (trailFrames > 0) trailFrames--;
      const animated = playingRef.current && isAnimated(l, !!photoRef.current);
      if (!visible) return;
      if (!(animated || settling || trailFrames > 0 || dirty.current)) return;
      dirty.current = false;
      r.render(l, phase, frame, ptr);
      if (import.meta.env.DEV) (window as unknown as { __frames: number }).__frames = ((window as unknown as { __frames?: number }).__frames ?? 0) + 1;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      ro.disconnect();
      io.disconnect();
      r.dispose(false);
      rendererRef.current = null;
      t0 = 0;
    };
  }, []);

  // refit immediately when the canvas size changes (the render loop would also catch it on its next frame)
  useEffect(() => {
    refit.current();
  }, [look.size.w, look.size.h]);

  useEffect(() => {
    refit.current();
    if (zoom === '100' && wrapRef.current) {
      const el = wrapRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    }
  }, [zoom]);

  useEffect(() => {
    refit.current();
  }, [quality]);

  return (
    <div
      className={'stage' + (dragging ? ' dragging' : '') + (zoom === '100' ? ' zoom100' : zoom === 'fill' ? ' zoomfill' : '')}
      ref={wrapRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) setPhotoFile(f).catch((err) => alert(err.message));
      }}
    >
      <canvas ref={canvasRef} />
      <div className="zoomBar">
        <button className={zoom === 'fit' ? 'on' : ''} onClick={() => setZoom('fit')} title="Whole canvas visible">Fit</button>
        <button className={zoom === 'fill' ? 'on' : ''} onClick={() => setZoom('fill')} title="Canvas covers the stage, edges cropped">Fill</button>
        <button className={zoom === '100' ? 'on' : ''} onClick={() => setZoom('100')} title="One export pixel per screen pixel">100%</button>
        <select className="quality" value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)} title="Preview render scale. Export is always full resolution.">
          <option value="auto">Auto</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      {dragging && <div className="dropHint">Drop image to restyle it</div>}
    </div>
  );
}
