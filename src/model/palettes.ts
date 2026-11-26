import type { ColorStop } from './look';

type Palette = { id: string; name: string; stops: ColorStop[] };

function palette(id: string, name: string, colors: string[], positions?: number[]): Palette {
  return { id, name, stops: colors.map((color, i) => ({ color, pos: positions?.[i] ?? i / (colors.length - 1) })) };
}

// Ordered from shadows to highlights to keep image detail readable when mapped.
export const COLOR_PALETTES: Palette[] = [
  palette('autumn', 'Autumn', ['#723443', '#c94a65', '#f5744c', '#ffa956', '#ffbd4d', '#f6d969'], [0.27, 0.44, 0.59, 0.7, 0.78, 0.86]),
  palette('indigo', 'Indigo', ['#171e3c', '#344b78', '#627fa6', '#a1b7ce', '#edf0e6']),
  palette('saffron', 'Saffron', ['#40232a', '#914131', '#ce7436', '#efb85d', '#fff0c2']),
  palette('rose', 'Rose', ['#392435', '#794357', '#b76c7d', '#e5a7ae', '#fce6df']),
  palette('forest', 'Forest', ['#1b302c', '#3b5e4b', '#71936b', '#afc397', '#edf0d2']),
  palette('ocean', 'Ocean', ['#142e45', '#245e7d', '#369aab', '#8ccfd0', '#e4f4ed']),
  palette('lilac', 'Lilac', ['#2c2546', '#5e4d84', '#9384b4', '#c3b9dd', '#f0eafa']),
  palette('graphite', 'Graphite', ['#242529', '#53565d', '#888b91', '#bfc1c4', '#f1f0eb']),
];

export function gradientPreview(stops: ColorStop[]): string {
  return `linear-gradient(90deg, ${[...stops].sort((a, b) => a.pos - b.pos).map(s => `${s.color} ${s.pos * 100}%`).join(', ')})`;
}
