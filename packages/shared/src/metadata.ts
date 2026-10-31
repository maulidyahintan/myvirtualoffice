// YouTube metadata safeguard to match format: Shorts must have #Shorts tag,
// standard videos must not (wrong tag makes standard videos "sold" as Shorts).
import type { Format, YouTubeMetadata } from './types.ts';

const HASHTAG_SHORTS = /#shorts\b/gi;
const TAG_SHORTS = /\bshorts?\b/i;

/** Clean up metadata according to video format. */
export function normalizeMetadata(m: YouTubeMetadata, format: Format = 'standard'): YouTubeMetadata {
  let description = m.description;
  let tags = m.tags;
  let title = m.title;
  if (format === 'short') {
    if (!/#shorts\b/i.test(description)) description = `${description.trimEnd()}\n\n#Shorts`;
  } else {
    title = title.replace(HASHTAG_SHORTS, '').replace(/\s{2,}/g, ' ').trim();
    description = description
      .replace(HASHTAG_SHORTS, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    tags = tags.filter((t) => !TAG_SHORTS.test(t));
  }
  return { ...m, title: title.slice(0, 100), description, tags };
}

/** Metadata issues to watch before upload (empty = safe). */
export function checkMetadata(m: YouTubeMetadata, format: Format = 'standard'): string[] {
  const issues: string[] = [];
  const hasShortsHashtag = /#shorts\b/i.test(`${m.title} ${m.description}`);
  if (format === 'short') {
    if (!hasShortsHashtag) issues.push('Deskripsi Shorts belum memakai #Shorts (ditambahkan otomatis saat upload).');
    if (m.title.length > 60) issues.push(`Judul Shorts ${m.title.length} karakter; sebaiknya ≤ 60 supaya tidak terpotong.`);
  } else {
    if (hasShortsHashtag || m.tags.some((t) => TAG_SHORTS.test(t)))
      issues.push('Metadata video biasa memakai #Shorts / tag "shorts" (sepertinya tertukar dengan versi Shorts; dibuang otomatis saat upload).');
    if (m.title.length > 70) issues.push(`Judul ${m.title.length} karakter; sebaiknya ≤ 70 supaya tidak terpotong di pencarian.`);
    if (m.description.length < 200) issues.push('Deskripsi video biasa terlalu pendek untuk SEO (sebaiknya ≥ 200 karakter).');
  }
  return issues;
}
