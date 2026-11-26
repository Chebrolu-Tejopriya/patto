type Name = 'search' | 'upload' | 'sun' | 'moon' | 'play' | 'pause' | 'save' | 'arrow' | 'grid' | 'reset' | 'copy' | 'gradient' | 'bookmark' | 'shuffle';
const paths: Record<Name, string> = {
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  copy: 'M9 9h12v12H9ZM15 9V3H3v12h6',
  gradient: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18m3-17v16m3-14v12',
  bookmark: 'M6 3h12v18l-6-4-6 4Z',
  shuffle: 'M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6m3-4c1-2 2-2 3-2h3m-4-4 4 4-4 4',
  search: 'M21 21l-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
  play: 'm9 5 11 7-11 7Z', pause: 'M9 5v14M15 5v14',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
};
export function Icon({name}: {name: Name}) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
