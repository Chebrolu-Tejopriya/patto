import type { Look } from '../model/look';

/** True when a look changes from frame to frame on its own (without cursor input).
 * Static looks are rendered once and left alone until something changes. */
export function isAnimated(look: Look, hasPhoto: boolean): boolean {
  // the gradient only shows when there is no photo, when haze fogs the photo, or around a contained photo
  const gradientVisible = !hasPhoto || look.photo.haze > 0 || look.photo.fit === 'contain';
  if (gradientVisible && look.gradient.flow > 0) return true;
  const p = look.pattern;
  if (p.type === 'ascii' && p.shape === 'diamond') {
    if (p.breathe > 0) return true;
  } else if (p.type !== 'none' && (p.breathe > 0 || p.scroll !== 0)) return true;
  if (look.effects.waves.on || look.effects.grain.on) return true;
  return false;
}

export type Quality = 'auto' | 'high' | 'medium' | 'low';

/** Render scale for the live stage. Export is always full resolution. */
export function qualityScale(q: Quality): number {
  if (q === 'high') return 1;
  if (q === 'medium') return 0.75;
  if (q === 'low') return 0.5;
  // auto: smaller machines get a lighter stage
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (mem <= 4 || cores <= 4) return 0.66;
  return 1;
}
