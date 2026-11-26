// One photo through every preset, with a verdict and a note per card.
// Served by Vite at /test.html. Change the image by replacing public/review/test-image.jpg.
import { Renderer } from '../engine/renderer';
import { cloneLook } from '../model/look';
import { BUILT_IN_PRESETS } from '../model/presets';

type Verdict = 'good' | 'meh' | 'bad';
type Feedback = Record<string, { verdict?: Verdict; text?: string; at?: string }>;
const IMG_NAME = new URLSearchParams(location.search).get('img') ?? 'test-image';
const IMAGE = `/review/${/^[a-z0-9-]+$/i.test(IMG_NAME) ? IMG_NAME : 'test-image'}.jpg`;
const FILE = 'test-feedback';

async function main() {
  const feedback: Feedback = await fetch(`/__review/feedback?file=${FILE}`).then((r) => r.json()).catch(() => ({}));
  (document.getElementById('src') as HTMLImageElement).src = IMAGE;
  const grid = document.getElementById('grid')!;
  const filtersEl = document.getElementById('filters')!;
  const summaryEl = document.getElementById('summary')!;
  let saveTimer = 0;
  const persist = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        const r = await fetch(`/__review/feedback?file=${FILE}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback, null, 2) });
        for (const s of document.querySelectorAll<HTMLElement>('.saved')) s.textContent = r.ok ? 'saved' : 'not saved';
      } catch {
        for (const s of document.querySelectorAll<HTMLElement>('.saved')) s.textContent = 'not saved (dev server?)';
      }
      summary();
    }, 400);
  };
  const summary = () => {
    const v = Object.values(feedback);
    const c = (k: Verdict) => v.filter((f) => f.verdict === k).length;
    summaryEl.textContent = `${c('good')} work, ${c('meh')} so-so, ${c('bad')} wrong, ${v.filter((f) => f.text?.trim()).length} notes.`;
  };

  let filter = 'all';
  const applyFilter = () => {
    for (const el of grid.children) {
      const e = el as HTMLElement;
      const kind = e.dataset.kind, v = e.dataset.verdict ?? '';
      e.classList.toggle('hidden', filter === 'all' ? false : filter === 'pattern' || filter === 'ombre' ? kind !== filter : v !== filter);
    }
    for (const b of filtersEl.children) b.classList.toggle('on', (b as HTMLElement).dataset.f === filter);
  };
  for (const [f, label] of [['all', 'all'], ['pattern', 'patterns'], ['ombre', 'ombres'], ['good', 'works'], ['meh', 'so-so'], ['bad', 'wrong']]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.f = f;
    b.onclick = () => { filter = f; applyFilter(); };
    filtersEl.appendChild(b);
  }

  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, 2, 2);
  let img = await fetch(IMAGE).then((x) => x.blob()).then((b) => createImageBitmap(b));
  // the stage would use the image's aspect with the long side at 1920; render at half that
  let w = 16, h = 16;
  const setImage = (bm: ImageBitmap) => {
    img = bm;
    r.setPhoto(img);
    const k = 960 / Math.max(img.width, img.height);
    w = Math.max(16, Math.round(img.width * k));
    h = Math.max(16, Math.round(img.height * k));
    r.resize(w, h);
  };
  setImage(img);
  const renderers: (() => void)[] = [];
  const fileEl = document.getElementById('file') as HTMLInputElement;
  fileEl.addEventListener('change', async () => {
    const f = fileEl.files?.[0];
    if (!f) return;
    const bm = await createImageBitmap(f);
    (document.getElementById('src') as HTMLImageElement).src = URL.createObjectURL(f);
    setImage(bm);
    for (const fn of renderers) {
      fn();
      await new Promise((res) => setTimeout(res, 0));
    }
  });

  const presets = [...BUILT_IN_PRESETS].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'pattern' ? -1 : 1));
  for (const p of presets) {
    const fb = (feedback[p.id] ??= {});
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.kind = p.kind;
    el.innerHTML = `
      <div class="fig"><canvas></canvas><span class="tag">${p.kind}</span></div>
      <div><b>${p.name}</b> <small>${p.pattern.type === 'none' ? 'ombre grading' : p.pattern.type}</small></div>
      <div class="verdict">
        <button class="good" data-v="good">works</button>
        <button class="meh" data-v="meh">so-so</button>
        <button class="bad" data-v="bad">wrong</button>
      </div>
      <textarea placeholder="What is right, what is wrong, what to change."></textarea>
      <div class="saved"></div>`;
    grid.appendChild(el);
    const ta = el.querySelector('textarea')!;
    ta.value = fb.text ?? '';
    const reflect = () => {
      el.dataset.verdict = fb.verdict ?? '';
      el.classList.toggle('bad', fb.verdict === 'bad');
      for (const b of el.querySelectorAll<HTMLButtonElement>('.verdict button')) b.classList.toggle('on', b.dataset.v === fb.verdict);
    };
    reflect();
    ta.addEventListener('input', () => { fb.text = ta.value; fb.at = new Date().toISOString(); el.querySelector('.saved')!.textContent = 'saving…'; persist(); });
    for (const b of el.querySelectorAll<HTMLButtonElement>('.verdict button')) {
      b.onclick = () => { fb.verdict = fb.verdict === b.dataset.v ? undefined : (b.dataset.v as Verdict); fb.at = new Date().toISOString(); reflect(); applyFilter(); persist(); };
    }
    // render (and re-render when another image is dropped in)
    const out = el.querySelector('canvas')!;
    const draw = () => {
      out.width = w;
      out.height = h;
      try {
        const look = cloneLook(p);
        look.size = { w: w * 2, h: h * 2 };
        look.photo.fit = 'cover';
        r.render(look, 0.15, 3);
        out.getContext('2d')!.drawImage(canvas, 0, 0);
      } catch (e) {
        console.error('render failed', p.id, e);
      }
    };
    renderers.push(draw);
    draw();
    await new Promise((res) => setTimeout(res, 0));
  }
  summary();
  applyFilter();
}

main().catch((e) => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:24px">${String(e)}</pre>`);
});
