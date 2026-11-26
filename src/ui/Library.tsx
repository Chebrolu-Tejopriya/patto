import type { Look } from '../model/look';
import { useStore } from '../store';
import { Section } from './controls';
import { Thumb } from './Thumb';

/** Left panel: built-in presets and the user's saved looks with versions. */
export function Library() {
  const { look, presets, saved, load, saveVersion, saveAsNew, deleteSaved, photo, setPhotoFile, clearPhoto } = useStore();

  const groups = new Map<string, Look[]>();
  for (const s of saved) {
    const arr = groups.get(s.id) ?? [];
    arr.push(s);
    groups.set(s.id, arr);
  }

  return (
    <aside className="panel library">
      <div className="brand">
        <i />
        <span>Patto</span>
      </div>

      <Section
        title="Image"
        right={
          photo && (
            <button className="mini" onClick={clearPhoto}>
              Remove
            </button>
          )
        }
      >
        <label className={'upload' + (photo ? ' has' : '')}>
          <input
            type="file"
            accept="image/*"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) setPhotoFile(f).catch((e) => alert(e.message));
              ev.target.value = '';
            }}
          />
          {photo ? (
            <>
              <strong>{photo.name}</strong>
              <small>
                {photo.bitmap.width}×{photo.bitmap.height} · click to replace
              </small>
            </>
          ) : (
            <>
              <strong>Upload an image</strong>
              <small>or drop it on the canvas. Every preset below becomes a variant of it.</small>
            </>
          )}
        </label>
      </Section>

      <Section title={photo ? 'Pattern variants' : 'Patterns'}>
        <div className="grid">
          {presets
            .filter((p) => p.kind === 'pattern')
            .map((p) => (
              <Card key={p.id} look={p} active={p.id === look.id} onClick={() => load(p)} />
            ))}
        </div>
      </Section>

      <Section title={photo ? 'Ombre variants' : 'Ombres'}>
        <div className="grid">
          {presets
            .filter((p) => p.kind !== 'pattern')
            .map((p) => (
              <Card key={p.id} look={p} active={p.id === look.id} onClick={() => load(p)} />
            ))}
        </div>
      </Section>

      <Section
        title="Saved"
        right={
          <div className="btns inline">
            <button className="mini" onClick={saveVersion} title="Save a new version of this look">
              Save v{(saved.filter((s) => s.id === look.id).length || 0) + 1}
            </button>
            <button
              className="mini"
              onClick={() => {
                const n = prompt('Name for the new preset', look.name);
                if (n !== null) saveAsNew(n);
              }}
            >
              Save as new
            </button>
          </div>
        }
      >
        {groups.size === 0 && <p className="hint">Nothing saved yet. Tweak the look and press Save.</p>}
        <div className="grid">
          {[...groups.values()].map((versions) =>
            versions
              .slice()
              .sort((a, b) => b.version - a.version)
              .map((s) => (
                <Card
                  key={s.id + s.version}
                  look={s}
                  active={s.id === look.id && s.version === look.version}
                  onClick={() => load(s)}
                  onDelete={() => deleteSaved(s.id, s.version)}
                />
              )),
          )}
        </div>
      </Section>
    </aside>
  );
}

function Card({ look, active, onClick, onDelete }: { look: Look; active: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className={'card' + (active ? ' active' : '')}>
      <button className="thumbBtn" onClick={onClick}>
        <Thumb look={look} />
      </button>
      <div className="meta">
        <span>{look.name}</span>
        <small>v{look.version}</small>
        {onDelete && (
          <button className="x" onClick={onDelete} title="Delete">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
