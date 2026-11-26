import { useState } from 'react';
import type { Look } from '../model/look';
import { useStore } from '../store';
import { Thumb } from './Thumb';
import { Icon } from './Icon';

const craft = new Set(['stitch', 'matty']);
const print = new Set(['bitmap', 'halftone', 'print', 'ascii', 'hatch', 'riso']);
export type Collection = 'patterns' | 'saved';
export function Library({ collection: tab }: { collection: Collection }) {
  const { look, presets, saved, load, saveAsNew, deleteSaved, photo, setPhotoFile, clearPhoto } = useStore();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const source = tab === 'saved' ? [...saved].reverse() : presets;
  const items = source.filter(p => (p.name + ' ' + p.pattern.type).toLowerCase().includes(query.toLowerCase()));
  const groups = new Map<string, Look[]>();
  for (const p of items) {
    const group = tab === 'saved' ? 'Your collection' : labelFor(p);
    groups.set(group, [...(groups.get(group) ?? []), p]);
  }
  return (
    <aside className="panel library" aria-label="Preset library">
      <div className="panelTitle"><h2>{tab === 'patterns' ? 'Effects' : 'Saved looks'}</h2><span className="countBadge">{source.length}</span></div>
      <div className="libraryTools"><label className="search"><Icon name="search" /><input placeholder="Search effects" aria-label="Search presets" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="x" aria-label="Clear search" onClick={() => setQuery('')}>&times;</button>}</label></div>
      <div className="libraryScroll">
        {[...groups].map(([group, looks]) => <section className="effectGroup" key={group} aria-label={group}>
          <h3>{group}<span>{looks.length}</span></h3>
          <div className="grid">
            {looks.map(p => <div key={p.id + ':' + p.version} className={'card' + (p.id === look.id && (tab !== 'saved' || p.version === look.version) ? ' active' : '')}>
              <button className="thumbBtn" title={p.name + (tab === 'saved' ? ` / v${p.version}` : '')} aria-label={`Apply ${p.name}${tab === 'saved' ? ` version ${p.version}` : ''}`} aria-pressed={p.id === look.id && (tab !== 'saved' || p.version === look.version)} onClick={() => load(p)}><Thumb look={p} /></button>
              <span className="effectTooltip">{p.name}{tab === 'saved' ? ` / v${p.version}` : ''}</span>
              {tab === 'saved' && <button className="deleteLook" title="Delete saved version" aria-label={`Delete ${p.name} version ${p.version}`} onClick={() => deleteSaved(p.id, p.version)}>&times;</button>}
            </div>)}
          </div>
        </section>)}
        {!items.length && <div className="emptyLibrary"><Icon name="grid" /><strong>{query ? 'No matching looks' : 'A space for your favourites'}</strong><p>{query ? 'Try another name or category.' : 'Save a version of your look and find it here.'}</p></div>}
        {tab === 'saved' && <button className="newLook" onClick={() => {const name = prompt('Name your new look', look.name); if(name !== null) saveAsNew(name);}}>+ Save current as a new look</button>}
      </div>
      <div className="imageDock"><div className="dockHeading"><span>Source image</span>{photo && <button className="x" onClick={clearPhoto} aria-label="Remove uploaded image">Remove</button>}</div>
        <label className={'upload' + (photo ? ' has' : '')}><input type="file" accept="image/*" aria-label="Upload image" onChange={e => {const f = e.target.files?.[0]; if(f) {setError(''); setPhotoFile(f).catch(err => setError(err.message));} e.target.value = '';}} /><span className="uploadIcon"><Icon name="upload" /></span><span><strong>{photo ? photo.name : 'Upload an image'}</strong><small>{photo ? 'Click to replace your image' : 'Or drop it onto the canvas'}</small></span></label>{error && <p className="err" role="alert">{error}</p>}
      </div>
    </aside>
  );
}
function labelFor(p: Look) {
  if(p.kind === 'ombre') return 'Gradient & motion';
  if(craft.has(p.pattern.type)) return 'Thread & texture';
  if(print.has(p.pattern.type)) return 'Ink & print';
  if(['hatch','glyph','ascii'].includes(p.pattern.type)) return 'Line & mark';
  if(['voxel','papercut','split','blocks'].includes(p.pattern.type)) return 'Depth & layers';
  if(['soft','glitch'].includes(p.pattern.type)) return 'Light & distortion';
  return 'Pixel & grid';
}
