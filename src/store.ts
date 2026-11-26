import { create } from 'zustand';
import type { Quality } from './engine/motion';
import { cloneLook, defaultLook, normalizeLook, uid, type Look } from './model/look';
import { BUILT_IN_PRESETS } from './model/presets';

const STORAGE_KEY = 'patterns.saved.v1';

function loadSaved(): Look[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Look>[]).map(normalizeLook) : [];
  } catch {
    return [];
  }
}
function persist(saved: Look[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

type Patch = (l: Look) => void;

/** The uploaded photo. Lives outside the Look so documents stay small and shareable. */
export type Photo = { bitmap: ImageBitmap; name: string; key: string };

export type State = {
  look: Look;
  playing: boolean;
  photo: Photo | null;
  quality: Quality; // live stage render scale, not export
  setQuality: (q: Quality) => void;
  setPhotoFile: (file: File) => Promise<void>;
  clearPhoto: () => void;
  saved: Look[]; // user presets + versions
  presets: Look[]; // built-in
  update: (patch: Patch) => void;
  load: (l: Look) => void;
  setPlaying: (p: boolean) => void;
  saveVersion: () => void;
  saveAsNew: (name: string) => void;
  deleteSaved: (id: string, version: number) => void;
  randomize: () => void;
};

/** Canvas size that matches an image's aspect, longest side 1920. */
export function sizeForImage(w: number, h: number) {
  const k = 1920 / Math.max(w, h);
  return { w: Math.max(16, Math.round(w * k)), h: Math.max(16, Math.round(h * k)) };
}

export const useStore = create<State>((set, get) => ({
  look: cloneLook(BUILT_IN_PRESETS[0]),
  playing: true,
  photo: null,
  quality: ((): Quality => {
    try {
      const q = localStorage.getItem('patterns.quality');
      return q === 'high' || q === 'medium' || q === 'low' ? q : 'auto';
    } catch {
      return 'auto';
    }
  })(),
  setQuality: (quality) => {
    try {
      localStorage.setItem('patterns.quality', quality);
    } catch {
      /* ignore */
    }
    set({ quality });
  },

  setPhotoFile: async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('Please drop an image file.');
    // cap the texture so huge phone photos stay fast; export quality is unaffected at these sizes
    const raw = await createImageBitmap(file);
    const max = 2048;
    const k = Math.min(1, max / Math.max(raw.width, raw.height));
    const bitmap = k < 1 ? await createImageBitmap(raw, { resizeWidth: Math.round(raw.width * k), resizeHeight: Math.round(raw.height * k), resizeQuality: 'high' }) : raw;
    if (bitmap !== raw) raw.close();
    get().photo?.bitmap.close();
    // the canvas follows the image so nothing is cropped away
    const size = sizeForImage(bitmap.width, bitmap.height);
    set({ photo: { bitmap, name: file.name, key: uid() }, look: { ...get().look, size } });
  },

  clearPhoto: () => {
    get().photo?.bitmap.close();
    set({ photo: null });
  },
  saved: loadSaved(),
  presets: BUILT_IN_PRESETS,

  update: (patch) =>
    set((s) => {
      const l = cloneLook(s.look);
      patch(l);
      return { look: l };
    }),

  load: (l) => {
    const next = cloneLook(l);
    const p = get().photo;
    if (p) next.size = sizeForImage(p.bitmap.width, p.bitmap.height); // presets keep the image's aspect while a photo is loaded
    set({ look: next });
  },
  setPlaying: (playing) => set({ playing }),

  saveVersion: () => {
    const { look, saved } = get();
    const existing = saved.filter((s) => s.id === look.id);
    const version = existing.length ? Math.max(...existing.map((s) => s.version)) + 1 : 1;
    const snap = { ...cloneLook(look), version };
    const next = [...saved, snap];
    persist(next);
    set({ saved: next, look: { ...look, version } });
  },

  saveAsNew: (name) => {
    const { look, saved } = get();
    const snap = { ...cloneLook(look), id: uid(), name: name || 'Untitled', version: 1 };
    const next = [...saved, snap];
    persist(next);
    set({ saved: next, look: cloneLook(snap) });
  },

  deleteSaved: (id, version) => {
    const next = get().saved.filter((s) => !(s.id === id && s.version === version));
    persist(next);
    set({ saved: next });
  },

  randomize: () =>
    set((s) => {
      const l = cloneLook(s.look);
      const base = defaultLook();
      l.gradient.seed = Math.floor(Math.random() * 1000);
      l.gradient.warp = +(Math.random() * 0.9 + 0.1).toFixed(2);
      l.gradient.scale = +(Math.random() * 2.5 + 0.6).toFixed(2);
      l.gradient.angle = Math.floor(Math.random() * 360);
      const hue = Math.random() * 360;
      l.gradient.stops = [0, 0.33, 0.66, 1].map((pos, i) => ({
        pos,
        color: hsl(hue + i * (25 + Math.random() * 40), 60 + Math.random() * 30, 15 + i * 22),
      }));
      l.motion = base.motion;
      return { look: l };
    }),
}));

function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
