// Pengaman metadata YouTube supaya sesuai format: Shorts wajib bertagar #Shorts,
// video biasa tidak boleh (salah tagar membuat video biasa ikut "dijual" sebagai Shorts).
import type { Format, MetadataYouTube } from './types.ts';

const TAGAR_SHORTS = /#shorts\b/gi;
const TAG_SHORTS = /\bshorts?\b/i;

/** Rapikan metadata sesuai format video. */
export function rapikanMetadata(m: MetadataYouTube, format: Format = 'biasa'): MetadataYouTube {
  let deskripsi = m.deskripsi;
  let tags = m.tags;
  let judul = m.judul;
  if (format === 'short') {
    if (!/#shorts\b/i.test(deskripsi)) deskripsi = `${deskripsi.trimEnd()}\n\n#Shorts`;
  } else {
    judul = judul.replace(TAGAR_SHORTS, '').replace(/\s{2,}/g, ' ').trim();
    deskripsi = deskripsi
      .replace(TAGAR_SHORTS, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    tags = tags.filter((t) => !TAG_SHORTS.test(t));
  }
  return { ...m, judul: judul.slice(0, 100), deskripsi, tags };
}

/** Masalah metadata yang perlu diperhatikan sebelum upload (kosong = aman). */
export function cekMetadata(m: MetadataYouTube, format: Format = 'biasa'): string[] {
  const masalah: string[] = [];
  const adaTagarShorts = /#shorts\b/i.test(`${m.judul} ${m.deskripsi}`);
  if (format === 'short') {
    if (!adaTagarShorts) masalah.push('Deskripsi Shorts belum memakai #Shorts (ditambahkan otomatis saat upload).');
    if (m.judul.length > 60) masalah.push(`Judul Shorts ${m.judul.length} karakter; sebaiknya ≤ 60 supaya tidak terpotong.`);
  } else {
    if (adaTagarShorts || m.tags.some((t) => TAG_SHORTS.test(t)))
      masalah.push('Metadata video biasa memakai #Shorts / tag "shorts" (sepertinya tertukar dengan versi Shorts; dibuang otomatis saat upload).');
    if (m.judul.length > 70) masalah.push(`Judul ${m.judul.length} karakter; sebaiknya ≤ 70 supaya tidak terpotong di pencarian.`);
    if (m.deskripsi.length < 200) masalah.push('Deskripsi video biasa terlalu pendek untuk SEO (sebaiknya ≥ 200 karakter).');
  }
  return masalah;
}
