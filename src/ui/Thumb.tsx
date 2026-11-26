import { useEffect, useRef } from 'react';
import { Renderer } from '../engine/renderer';
import type { Look } from '../model/look';
import { sizeForImage, useStore } from '../store';

// One shared offscreen renderer draws every thumbnail, then the result is
// copied into a small 2D canvas. Avoids one WebGL context per card.
let shared: { canvas: HTMLCanvasElement; r: Renderer; photoKey: string | null } | null = null;
function getShared() {
  if (!shared) {
    const canvas = document.createElement('canvas');
    shared = { canvas, r: new Renderer(canvas, 240, 135), photoKey: null };
  }
  return shared;
}

export function Thumb({ look }: { look: Look }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const photo = useStore((s) => s.photo);
  const key = JSON.stringify(look) + (photo?.key ?? '');
  useEffect(() => {
    const c = ref.current!;
    // thumbnails follow the loaded image's aspect, like the stage
    const lk = photo ? { ...look, size: sizeForImage(photo.bitmap.width, photo.bitmap.height) } : look;
    const aspect = lk.size.w / lk.size.h;
    const w = 240;
    const h = Math.max(40, Math.round(w / aspect));
    c.width = w;
    c.height = h;
    try {
      const s = getShared();
      const pk = photo?.key ?? null;
      if (s.photoKey !== pk) {
        s.r.setPhoto(photo?.bitmap ?? null);
        s.photoKey = pk;
      }
      s.r.resize(w, h);
      s.r.render(lk, 0.15, 3);
      c.getContext('2d')!.drawImage(s.canvas, 0, 0);
    } catch {
      /* ignore thumbnail failures */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} className="thumb" />;
}
