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

/** Ukuran & durasi pembuka/penutup per format. */
export const SPEK_FORMAT = {
  biasa: { lebar: 1920, tinggi: 1080, introDetik: 3, outroDetik: 4, introMaksDetik: 10, outroMaksDetik: 12 },
  short: { lebar: 1080, tinggi: 1920, introDetik: 1.5, outroDetik: 2, introMaksDetik: 3, outroMaksDetik: 4 },
} as const;

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
