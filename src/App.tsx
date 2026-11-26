import { useEffect, useState } from 'react';
import { Inspector } from './ui/Inspector';
import { Library, type Collection } from './ui/Library';
import { Stage } from './ui/Stage';
import { ExportMenu } from './ui/ExportMenu';
import { Icon } from './ui/Icon';
import { useStore } from './store';

export default function App() {
  const look = useStore(s => s.look);
  const playing = useStore(s => s.playing);
  const setPlaying = useStore(s => s.setPlaying);
  const saveVersion = useStore(s => s.saveVersion);
  const saved = useStore(s => s.saved);
  const presets = useStore(s => s.presets);
  const load = useStore(s => s.load);
  const [collection, setCollection] = useState<Collection>('patterns');
  const [notice, setNotice] = useState('');
  const serializedLook = JSON.stringify(look);
  const isSaved = saved.some(s => s.id === look.id && s.version === look.version && JSON.stringify(s) === serializedLook);
  const original = presets.find(p => p.id === look.id) ?? saved.find(p => p.id === look.id && p.version === look.version);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('patto.editor-theme.v2') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('patto.editor-theme.v2', theme); } catch { /* optional preference */ }
  }, [theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const copyLook = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(look, null, 2)); setNotice('Look settings copied'); }
    catch { setNotice('Clipboard unavailable. Export JSON to save your settings.'); }
  };
  return (
    <div className="editorShell">
      <nav className="toolRail" aria-label="Studio navigation">
        <span className="railBrand" title="Patto Studio" aria-label="Patto Studio">&#10035;</span>
        <div className="railTools">
          <button className={collection === 'patterns' ? 'active' : ''} aria-label="Browse effects" aria-pressed={collection === 'patterns'} title="Effects" onClick={() => setCollection('patterns')}><Icon name="grid" /></button>
          <button className={collection === 'saved' ? 'active' : ''} aria-label="Browse saved looks" aria-pressed={collection === 'saved'} title="Saved looks" onClick={() => setCollection('saved')}><Icon name="bookmark" /></button>
        </div>
        <button className="themeButton" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title="Switch theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'moon' : 'sun'} /></button>
        <span className="railSignature" title="Patto">p.</span>
      </nav>
      <Library key={collection} collection={collection} />
      <main className="workspace">
        <header className="editorToolbar" aria-label="Canvas actions">
          <div className="toolbarGroup">
            <button title="Restore this preset's settings" disabled={!original} onClick={() => original && load(original)}><Icon name="reset" /><span>Reset</span></button>
            <button aria-label={playing ? 'Pause animation' : 'Play animation'} aria-pressed={playing} onClick={() => setPlaying(!playing)}><Icon name={playing ? 'pause' : 'play'} /><span>{playing ? 'Pause' : 'Animate'}</span></button>
          </div>
          <div className="toolbarGroup toolbarEnd">
            <button onClick={copyLook} title="Copy look settings as JSON"><Icon name="copy" /><span>Copy look</span></button>
            <button aria-label={isSaved ? 'Saved' : 'Save version'} onClick={saveVersion} disabled={isSaved}><Icon name="save" /><span>{isSaved ? 'Saved' : 'Save'}</span></button>
            <ExportMenu />
          </div>
        </header>
        <Stage />
        <footer className="canvasFooter"><div className="lookIdentity"><span className="liveDot" /><h1>{look.name}</h1><span className="versionBadge">v{look.version}</span></div><span className="dimensions">{look.size.w} &times; {look.size.h}</span><span className="loopInfo">{look.motion.loopSeconds}s loop</span></footer>
      </main>
      <Inspector />
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
