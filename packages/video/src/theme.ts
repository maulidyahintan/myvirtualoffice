import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Font disimpan lokal di public/fonts (lisensi SIL OFL 1.1, bebas komersial),
// jadi render tetap jalan tanpa internet.
const font = (family: string, file: string, weight: string) =>
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: 'woff2' });

font('Fredoka', 'fredoka-latin-600-normal.woff2', '600');
font('Fredoka', 'fredoka-latin-700-normal.woff2', '700');
font('Nunito', 'nunito-latin-700-normal.woff2', '700');
font('Nunito', 'nunito-latin-800-normal.woff2', '800');
font('Noto Naskh Arabic', 'noto-naskh-arabic-arabic-500-normal.woff2', '500');
font('Noto Naskh Arabic', 'noto-naskh-arabic-arabic-700-normal.woff2', '700');

export const titleFont = 'Fredoka, sans-serif';
export const textFont = 'Nunito, sans-serif';
export const arabicFont = '"Noto Naskh Arabic", serif';

// Palet lembut (tidak menyilaukan, ramah mata anak)
export const warna = {
  pipi: '#F29C9C',
  garis: '#3B2F2F',
  mochi: '#F0A04B',
  mochiBelang: '#D9822B',
  mochiPerut: '#FCE3C4',
  teksGelap: '#2E2A3B',
  kartu: '#FFFBF2',
  emas: '#E8B04A',
};
