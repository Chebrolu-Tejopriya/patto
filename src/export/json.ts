import { normalizeLook, type Look } from '../model/look';
import { download } from './download';
import { slug } from './png';

export function exportJSON(look: Look) {
  const blob = new Blob([JSON.stringify(look, null, 2)], { type: 'application/json' });
  download(blob, `${slug(look.name)}-v${look.version}.look.json`);
}

export function importJSON(file: File): Promise<Look> {
  return file.text().then((t) => {
    const l = JSON.parse(t);
    if (l?.schema !== 1 || !l.gradient || !l.effects) throw new Error('Not a valid look file');
    return normalizeLook(l);
  });
}
