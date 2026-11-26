import { useEffect, useRef, useState } from 'react';
import { exportJSON, importJSON } from '../export/json';
import { exportPNG } from '../export/png';
import { exportMP4, type VideoOptions } from '../export/video';
import { useStore } from '../store';
import { Seg, Slider } from './controls';

type Format = 'PNG' | 'MP4' | 'JSON';
type Quality = NonNullable<VideoOptions['quality']>;
const SCALES = [0.5, 1, 2];

/** One Export button; everything about exporting lives in its popover. */
export function ExportMenu() {
  const look = useStore((s) => s.look);
  const load = useStore((s) => s.load);
  const photo = useStore((s) => s.photo);
  const update = useStore((s) => s.update);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>('PNG');
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState<Quality>('good');
  const [phase, setPhase] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // close on outside click / Escape (but not while an export is running)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (busy) return;
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy]);

  const w = Math.round(look.size.w * scale);
  const h = Math.round(look.size.h * scale);
  const frames = Math.round(look.motion.loopSeconds * look.motion.fps);

  const run = async () => {
    setErr(null);
    setBusy(true);
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      if (format === 'PNG') await exportPNG(look, phase, scale, photo?.bitmap ?? null);
      else if (format === 'MP4') await exportMP4(look, { scale, quality, photo: photo?.bitmap ?? null }, (d, t) => setProgress(d / t), ac.signal);
      else exportJSON(look);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr((e as Error).message);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="exportWrap" ref={popRef}>
      <button className={'primary' + (open ? ' on' : '')} onClick={() => setOpen((o) => !o)}>
        Export
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Export">
          <Seg<Format> value={format} options={['PNG', 'MP4', 'JSON']} onChange={setFormat} />

          {format !== 'JSON' && (
            <div className="row">
              <span>Scale</span>
              <div className="seg small">
                {SCALES.map((s) => (
                  <button key={s} className={s === scale ? 'on' : ''} onClick={() => setScale(s)}>
                    {s}×
                  </button>
                ))}
              </div>
              <code>
                {w}×{h}
              </code>
            </div>
          )}

          {format === 'PNG' && (
            <Slider label="Frame" value={phase} min={0} max={0.99} step={0.01} fmt={(v) => `${(v * look.motion.loopSeconds).toFixed(1)}s`} onChange={setPhase} />
          )}

          {format === 'MP4' && (
            <>
              <Slider label="Loop" value={look.motion.loopSeconds} min={1} max={20} step={0.5} fmt={(v) => v + 's'} onChange={(v) => update((l) => (l.motion.loopSeconds = v))} />
              <Slider label="FPS" value={look.motion.fps} min={12} max={60} step={1} onChange={(v) => update((l) => (l.motion.fps = v))} />
              <div className="row">
                <span>Quality</span>
                <div className="seg small">
                  {(['draft', 'good', 'best'] as Quality[]).map((q) => (
                    <button key={q} className={q === quality ? 'on' : ''} onClick={() => setQuality(q)}>
                      {q}
                    </button>
                  ))}
                </div>
                <code>{frames}f</code>
              </div>
              <p className="hint">H.264, seamless loop. Needs Chrome or Edge.</p>
            </>
          )}

          {format === 'JSON' && (
            <p className="hint">The full look as a .look.json file: colours, effects, motion. Re-import it here or share it.</p>
          )}

          <div className="popActions">
            <button className="primary" disabled={busy} onClick={run}>
              {busy ? `Encoding ${Math.round(progress * 100)}%` : format === 'PNG' ? 'Download PNG' : format === 'MP4' ? 'Render MP4' : 'Download JSON'}
            </button>
            {busy && format === 'MP4' ? (
              <button className="mini" onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            ) : (
              <label className="mini file">
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) importJSON(f).then(load).catch((e) => setErr(e.message));
                    ev.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
          {busy && format === 'MP4' && (
            <div className="bar">
              <div style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {err && <p className="err">{err}</p>}
        </div>
      )}
    </div>
  );
}
