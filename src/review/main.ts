// Side-by-side review of the Pinterest board against the techniques derived from it.
// Served by Vite at /review.html. Renders every pin through its mapped preset with
// the real engine, so what you see is what the app would produce.
import { Renderer } from '../engine/renderer';
import { cloneLook } from '../model/look';
import { BUILT_IN_PRESETS } from '../model/presets';

type Meta = { i: number; w: number; h: number; title: string; url: string };
type Row = { i: number; preset: string; status: 'used' | 'partial' | 'unused'; note: string; pattern?: string; scope?: string; texture?: string; separation?: string; palette?: string; derive?: string };
type Feedback = Record<string, { text?: string; eliminated?: boolean; at?: string }>;

const TECH_LABEL: Record<string, string> = {
  matty: 'Matty work', pixelart: 'Pixel art',
  bitmap: 'Bitmap', halftone: 'Halftone', print: 'Print', ascii: 'ASCII', stitch: 'Stitch', hatch: 'Engrave',
  riso: 'Riso', papercut: 'Paper cut', tiles: 'Mosaic', cells: 'Cells', split: 'Split', blocks: 'Blocks', glyph: 'Glyphs', voxel: 'Voxel', mosaic: 'Shards', glitch: 'Glitch', soft: 'Airbrush', none: 'none',
};

// exposed for debugging in the browser console
Object.assign(window as unknown as Record<string, unknown>, { __Renderer: Renderer, __presets: BUILT_IN_PRESETS, __cloneLook: cloneLook });

async function main() {
  const [meta, mapping, feedback] = await Promise.all([
    fetch('/review/meta.json').then((r) => r.json() as Promise<Meta[]>),
    fetch('/review/mapping.json').then((r) => r.json() as Promise<{ rows: Row[] }>),
    fetch('/__review/feedback').then((r) => r.json() as Promise<Feedback>).catch(() => ({}) as Feedback),
  ]);
  const summaryEl = document.getElementById('summary')!;
  let saveTimer = 0;
  const setSaved = (t: string) => {
    for (const s of document.querySelectorAll<HTMLElement>('.fb .saved')) s.textContent = t;
  };
  const persist = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        const r = await fetch('/__review/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback, null, 2) });
        setSaved(r.ok ? 'saved' : 'not saved');
      } catch {
        setSaved('not saved (dev server?)');
      }
      updateSummary();
    }, 400);
  };
  const updateSummary = () => {
    const vals = Object.values(feedback);
    const elim = vals.filter((v) => v.eliminated).length;
    const notes = vals.filter((v) => v.text && v.text.trim()).length;
    summaryEl.textContent = `${notes} note${notes === 1 ? '' : 's'}, ${elim} eliminated. Feedback is written to public/review/feedback.json as you type.`;
  };
  const byI = new Map(meta.map((m) => [m.i, m]));
  const rowsEl = document.getElementById('rows')!;
  const filtersEl = document.getElementById('filters')!;

  // filters
  let filter = 'all';
  const counts = { all: mapping.rows.length, used: 0, partial: 0, unused: 0 };
  for (const r of mapping.rows) counts[r.status]++;
  const applyFilter = () => {
    for (const el of rowsEl.children) {
      const st = (el as HTMLElement).dataset.status;
      const elim = el.classList.contains('eliminated');
      el.classList.toggle('hidden', filter === 'eliminated' ? !elim : filter !== 'all' && st !== filter);
    }
    for (const b of filtersEl.children) b.classList.toggle('on', (b as HTMLElement).dataset.f === filter);
  };
  for (const f of ['all', 'used', 'partial', 'unused', 'eliminated'] as const) {
    const b = document.createElement('button');
    b.textContent = f === 'eliminated' ? 'eliminated' : `${f} (${counts[f]})`;
    b.dataset.f = f;
    b.onclick = () => { filter = f; applyFilter(); };
    filtersEl.appendChild(b);
  }

  // one shared renderer, like the thumbnails
  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, 2, 2);

  const pending: { row: Row; m: Meta; out: HTMLCanvasElement }[] = [];
  for (const row of mapping.rows) {
    const m = byI.get(row.i);
    if (!m) continue;
    const preset = BUILT_IN_PRESETS.find((p) => p.id === row.preset);
    const el = document.createElement('div');
    el.className = 'row';
    el.dataset.status = row.status;
    el.innerHTML = `
      <div class="fig"><img src="/review/pins/${String(row.i).padStart(2, '0')}.jpg" alt=""><span class="tag">pin ${row.i}</span></div>
      <div class="fig"><canvas></canvas><span class="tag">${preset ? preset.name : row.preset} · ${TECH_LABEL[preset?.pattern.type ?? 'none']}</span></div>
      <div class="meta">
        <b>${escapeHtml(m.title || 'Untitled pin')}</b>
        <span class="pill ${row.status}">${row.status}</span>
        ${row.pattern ? `<p><span class="k">Pattern</span> ${escapeHtml(row.pattern)}</p>` : ''}
        ${row.scope ? `<p><span class="k">Applied to</span> <span class="scope ${row.scope}">${row.scope}</span></p>` : ''}
        ${row.texture ? `<p><span class="k">Texture</span> ${escapeHtml(row.texture)}</p>` : ''}
        ${row.separation ? `<p><span class="k">Separation</span> ${escapeHtml(row.separation)}</p>` : ''}
        ${row.palette ? `<p><span class="k">Palette</span> ${escapeHtml(row.palette)}</p>` : ''}
        ${row.derive ? `<p><span class="k">To reproduce</span> ${escapeHtml(row.derive)}</p>` : ''}
        ${row.note ? `<p class="reply">${escapeHtml(row.note)}</p>` : ''}
        <p>Rendered with preset <code>${preset ? preset.name : row.preset}</code>${row.status === 'unused' ? ' (closest existing, for comparison only)' : ''}.</p>
        <a href="${m.url}" target="_blank" rel="noreferrer">open pin</a>
        <div class="fb">
          <textarea placeholder="Your feedback on this pin / technique: what to keep, what is wrong, what to change."></textarea>
          <div class="actions">
            <button class="danger elim">Eliminate pattern</button>
            <span class="elimTag">eliminated</span>
            <span class="saved"></span>
          </div>
        </div>
      </div>`;
    rowsEl.appendChild(el);
    {
      const key = String(row.i);
      const fb = (feedback[key] ??= {});
      const ta = el.querySelector<HTMLTextAreaElement>('textarea')!;
      const elimBtn = el.querySelector<HTMLButtonElement>('.elim')!;
      const savedEl = el.querySelector<HTMLElement>('.saved')!;
      const reflect = () => {
        el.classList.toggle('eliminated', !!fb.eliminated);
        elimBtn.textContent = fb.eliminated ? 'Restore pattern' : 'Eliminate pattern';
      };
      ta.value = fb.text ?? '';
      reflect();
      ta.addEventListener('input', () => {
        fb.text = ta.value;
        fb.at = new Date().toISOString();
        savedEl.textContent = 'saving…';
        persist();
      });
      elimBtn.addEventListener('click', () => {
        fb.eliminated = !fb.eliminated;
        fb.at = new Date().toISOString();
        reflect();
        applyFilter();
        persist();
      });
    }
    pending.push({ row, m, out: el.querySelector('canvas')! });
  }
  applyFilter();
  updateSummary();

  // render sequentially so the page stays responsive
  for (const { row, m, out } of pending) {
    const preset = BUILT_IN_PRESETS.find((p) => p.id === row.preset);
    if (!preset) continue;
    try {
      const img = await loadBitmap(`/review/pins/${String(row.i).padStart(2, '0')}.jpg`);
      const look = cloneLook(preset);
      const w = 720;
      const h = Math.max(120, Math.round((w * m.h) / m.w));
      look.size = { w, h };
      look.photo.fit = 'cover';
      out.width = w;
      out.height = h;
      r.setPhoto(img);
      r.resize(w, h);
      r.render(look, 0.15, 3);
      out.getContext('2d')!.drawImage(canvas, 0, 0);
      img.close();
    } catch (e) {
      console.error('render failed for pin', row.i, e);
    }
    await new Promise((res) => setTimeout(res, 0));
  }
}

function loadBitmap(src: string) {
  return fetch(src).then((r) => r.blob()).then((b) => createImageBitmap(b));
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

main().catch((e) => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:24px">${String(e)}</pre>`);
});
