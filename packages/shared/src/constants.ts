// Kosakata visual yang dipahami template Remotion.
// Kalau menambah latar/karakter baru di packages/video, tambahkan juga di sini
// supaya agen Sutradara boleh memakainya.

export const LATAR = [
  'kamar-malam',
  'ruang-tamu',
  'taman',
  'masjid',
  'dapur',
  'langit-malam',
  'gurun',
  'laut',
  'gunung',
  'fajar',
] as const;

/** Gerak suasana tambahan di atas latar (dipakai video hafalan). */
export const SUASANA = ['hujan', 'bintang', 'burung', 'cahaya', 'daun', 'kupu'] as const;

/** Pegawai yang bisa diajak ngobrol di halaman Chat (id sama dengan pegawai Kantor 3D). */
export const AGEN_CHAT = ['manajer', 'riset', 'penulis', 'reviewer', 'sutradara', 'channel'] as const;

/** Jenis konten: cerita (naskah + karakter) atau hafalan (bacaan surat Al-Qur'an). */
export const JENIS_KONTEN = ['cerita', 'hafalan'] as const;

export const KARAKTER = ['mamas', 'ibu', 'mochi'] as const;

export const EKSPRESI = ['senang', 'sedih', 'berpikir', 'kaget', 'tenang'] as const;

export const JENIS_ADEGAN = ['cerita', 'doa', 'pertanyaan'] as const;

export const USIA = ['1-3', '4-6', '7-10', '1-10'] as const;

/** Format video: biasa (16:9, 3–5 menit) atau YouTube Shorts (9:16, < 60 detik). */
export const FORMAT = ['biasa', 'short'] as const;

export const FORMAT_LABEL = { biasa: 'Video biasa', short: 'YouTube Shorts' } as const;

/** Pilihan saat menyetujui materi: 'keduanya' memecah satu ide jadi dua episode (video biasa + Shorts). */
export const PILIHAN_FORMAT = [...FORMAT, 'keduanya'] as const;
export type PilihanFormat = (typeof PILIHAN_FORMAT)[number];
export const PILIHAN_FORMAT_LABEL: Record<PilihanFormat, string> = { ...FORMAT_LABEL, keduanya: 'Keduanya (Video + Shorts)' };

/** Ukuran & durasi pembuka/penutup per format. */
export const SPEK_FORMAT = {
  biasa: { lebar: 1920, tinggi: 1080, introDetik: 3, outroDetik: 4, introMaksDetik: 10, outroMaksDetik: 12 },
  short: { lebar: 1080, tinggi: 1920, introDetik: 1.5, outroDetik: 2, introMaksDetik: 3, outroMaksDetik: 4 },
} as const;

/** Batas geser nada suara (semiton). Lebih dari ini suara mulai terdengar tidak alami. */
export const NADA_MAKS = 4;

/**
 * Filter ffmpeg pengubah suara. `nada` (semiton) menggeser nada sekaligus warna suara
 * (+ terdengar lebih kecil/anak-anak, − lebih berat); `tempo` 1 = kecepatan bicara asli.
 */
export function filterSuara({ nada = 0, tempo = 1 }: { nada?: number; tempo?: number }): string | undefined {
  const st = Math.round(nada * 2) / 2;
  const tp = Math.max(0.7, Math.min(1.4, tempo));
  if (!st && Math.abs(tp - 1) < 0.005) return undefined;
  const f = 2 ** (st / 12);
  return `aresample=48000,asetrate=${(48000 * f).toFixed(0)},aresample=48000,atempo=${(tp / f).toFixed(5)}`;
}

/** Geser nada seluruh rekaman episode tanpa mengubah tempo (0 = tanpa filter). */
export function filterNada(semiton: number): string | undefined {
  return filterSuara({ nada: Math.max(-NADA_MAKS, Math.min(NADA_MAKS, semiton)) });
}

export const JENIS_MUSIK = ['pembuka', 'penutup'] as const;
export type JenisMusik = (typeof JENIS_MUSIK)[number];

export const STATUS_LABEL = {
  idea: 'Ide',
  writing: 'Penulis sedang menulis…',
  reviewing: 'Reviewer sedang memeriksa…',
  needs_script_approval: 'Menunggu persetujuan naskah',
  directing: 'Sutradara & Channel Manager bekerja…',
  needs_audio: 'Menunggu rekaman suara',
  rendering: 'Video sedang dirender…',
  needs_video_approval: 'Menunggu persetujuan video',
  uploading: 'Sedang diupload…',
  scheduled: 'Terjadwal tayang',
  published: 'Tayang',
  rejected: 'Ditolak',
  error: 'Error',
} as const;

export type EpisodeStatus = keyof typeof STATUS_LABEL;

/** Status ketika ada agen yang sedang bekerja (dashboard akan auto-refresh). */
export const STATUS_SIBUK: EpisodeStatus[] = [
  'writing',
  'reviewing',
  'directing',
  'rendering',
  'uploading',
];

/** Kolom papan dashboard. */
export const FASE: { judul: string; status: EpisodeStatus[] }[] = [
  { judul: 'Ide', status: ['idea'] },
  { judul: 'Naskah', status: ['writing', 'reviewing', 'needs_script_approval'] },
  { judul: 'Rekam Suara', status: ['directing', 'needs_audio'] },
  { judul: 'Video', status: ['rendering', 'needs_video_approval', 'uploading'] },
  { judul: 'Tayang', status: ['scheduled', 'published'] },
  { judul: 'Arsip', status: ['rejected', 'error'] },
];

export const FPS = 30;
