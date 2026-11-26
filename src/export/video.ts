import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { Renderer } from '../engine/renderer';
import type { Look } from '../model/look';
import { download } from './download';
import { slug } from './png';

export type VideoProgress = (done: number, total: number) => void;
export type VideoOptions = { scale?: number; quality?: 'draft' | 'good' | 'best'; photo?: ImageBitmap | null };
const BPP: Record<NonNullable<VideoOptions['quality']>, number> = { draft: 0.06, good: 0.15, best: 0.3 };

/**
 * Offline, frame-exact MP4 export with WebCodecs. Each frame is rendered at
 * phase = i / N so the last frame leads straight back into the first: the loop
 * closes on the exact frame it started.
 */
export async function exportMP4(look: Look, opts: VideoOptions = {}, onProgress?: VideoProgress, signal?: AbortSignal) {
  const scale = opts.scale ?? 1;
  const bpp = BPP[opts.quality ?? 'good'];
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('WebCodecs is not supported in this browser. Use Chrome or Edge.');
  }
  // H.264 needs even dimensions
  const w = Math.round(look.size.w * scale) & ~1;
  const h = Math.round(look.size.h * scale) & ~1;
  const fps = look.motion.fps;
  const total = Math.max(1, Math.round(look.motion.loopSeconds * fps));

  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, w, h);
  r.setPhoto(opts.photo ?? null);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: w, height: h },
    fastStart: 'in-memory',
  });

  let encodeError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (encodeError = e),
  });

  const codec = pickAvcLevel(w, h);
  const config: VideoEncoderConfig = {
    codec,
    width: w,
    height: h,
    bitrate: Math.min(80_000_000, Math.round(w * h * fps * bpp)),
    framerate: fps,
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error(`Encoder config not supported: ${codec} ${w}x${h}`);
  encoder.configure(config);

  try {
    const usPerFrame = 1_000_000 / fps;
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      r.render(look, i / total, i);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (encodeError) throw encodeError;
      // keep the encoder queue bounded and the UI responsive
      if (encoder.encodeQueueSize > 8) await new Promise((res) => setTimeout(res, 0));
      onProgress?.(i + 1, total);
    }
    await encoder.flush();
    muxer.finalize();
    const buf = (muxer.target as ArrayBufferTarget).buffer;
    download(new Blob([buf], { type: 'video/mp4' }), `${slug(look.name)}-v${look.version}-loop.mp4`);
  } finally {
    if (encoder.state !== 'closed') encoder.close();
    r.dispose();
  }
}

function pickAvcLevel(w: number, h: number): string {
  const px = w * h;
  // High profile; level by frame size (4K needs 5.1)
  if (px > 1920 * 1080) return 'avc1.640033';
  if (px > 1280 * 720) return 'avc1.640028';
  return 'avc1.64001f';
}
