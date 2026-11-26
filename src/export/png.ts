import { Renderer } from '../engine/renderer';
import type { Look } from '../model/look';
import { download } from './download';

/** Render one frame offscreen at the look's native size and download a PNG. */
export async function exportPNG(look: Look, phase = 0, scale = 1, photo: ImageBitmap | null = null) {
  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, Math.round(look.size.w * scale), Math.round(look.size.h * scale));
  try {
    r.setPhoto(photo);
    r.render(look, phase, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('PNG encode failed');
    download(blob, `${slug(look.name)}-v${look.version}.png`);
  } finally {
    r.dispose();
  }
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'look';
}
