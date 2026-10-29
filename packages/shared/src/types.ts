import type {
  EKSPRESI,
  EpisodeStatus,
  AGEN_CHAT,
  FORMAT,
  JENIS_KONTEN,
  SUASANA,
  JENIS_ADEGAN,
  KARAKTER,
  LATAR,
  USIA,
} from './constants.ts';

export type { EpisodeStatus };
export type Latar = (typeof LATAR)[number];
export type Karakter = (typeof KARAKTER)[number];
export type Ekspresi = (typeof EKSPRESI)[number];
export type JenisAdegan = (typeof JENIS_ADEGAN)[number];
export type Usia = (typeof USIA)[number];
export type Format = (typeof FORMAT)[number];
export type JenisKonten = (typeof JENIS_KONTEN)[number];
export type AgenChat = (typeof AGEN_CHAT)[number];

/** Satu pesan di percakapan pemilik channel ↔ agen. */
export interface PesanChat {
  waktu: string;
  dari: 'saya' | 'agen';
  teks: string;
  /** episode yang sedang dibahas (opsional) */
  episodeId?: string;
}
export type Suasana = (typeof SUASANA)[number];

/** Pengaturan video hafalan surat. */
export interface InfoHafalan {
  /** nomor surat 1–114 */
  surat: number;
  namaSurat: string;
  ayatDari: number;
  ayatSampai: number;
  /** berapa kali tiap ayat dibaca berulang di rekaman */
  ulang: number;
  /** basmalah dibaca di awal (tidak untuk Al-Fatihah & At-Taubah) */
  basmalah: boolean;
}

/** Satu ayat (atau basmalah, nomor 0) beserta visual latarnya. */
export interface AyatHafalan {
  nomor: number;
  arab: string;
  latin: string;
  arti: string;
  latar: Latar;
  suasana: Suasana[];
}

/** Data video hafalan yang dikirim ke Remotion. */
export interface HafalanVideo {
  namaSurat: string;
  artiSurat: string;
  ayat: AyatHafalan[];
  ulang: number;
  /** detik mulai tiap segmen di rekaman (hasil deteksi jeda); kosong = dibagi rata */
  mulaiSegmen?: number[];
}

export interface Ide {
  judul: string;
  seri: string;
  usia: Usia;
  pesanMoral: string;
  /** Kosong = 'biasa' (episode lama sebelum ada pilihan format). */
  format?: Format;
  /** Kosong = 'cerita'. */
  jenis?: JenisKonten;
  hafalan?: InfoHafalan;
  alasan: string;
  referensi: string[];
}

export interface Dalil {
  jenis: 'ayat' | 'hadits' | 'doa' | 'atsar';
  teksArab?: string;
  latin?: string;
  terjemah: string;
  /** Contoh: "QS. Al-Baqarah: 286" atau "HR. Bukhari no. 6114" */
  sumber: string;
}

export interface AdeganNaskah {
  jenis: JenisAdegan;
  pembicara: Karakter | 'narator';
  /** Teks yang DIBACA saat rekaman suara. */
  narasi: string;
  /** Petunjuk visual singkat untuk Sutradara. */
  petunjukVisual: string;
}

export interface Naskah {
  judul: string;
  ringkasan: string;
  adegan: AdeganNaskah[];
  dalil: Dalil[];
}

export interface Review {
  keputusan: 'lolos' | 'revisi';
  skor: number;
  catatan: string[];
  /** Hal yang WAJIB dicek manusia sebelum approve (dalil, fakta sejarah, dll). */
  cekManusia: string[];
}

/** Adegan yang sudah "disutradarai" dan siap dirender. */
export interface Adegan {
  jenis: JenisAdegan;
  pembicara: Karakter | 'narator';
  narasi: string;
  latar: Latar;
  karakter: Karakter[];
  ekspresi: Ekspresi;
  /** Teks besar di layar (opsional), misal nama doa. */
  teksLayar?: string;
  /** Untuk adegan doa: teks Arab + latin + arti. */
  doa?: { arab: string; latin: string; arti: string };
}

export interface MetadataYouTube {
  judul: string;
  deskripsi: string;
  tags: string[];
  teksThumbnail: string;
}

export interface LogEntry {
  waktu: string;
  oleh: string;
  pesan: string;
}

export interface Episode {
  id: string;
  dibuat: string;
  diubah: string;
  status: EpisodeStatus;
  catatanStatus?: string;
  ide: Ide;
  /** Episode kembaran dari ide yang sama dengan format lain (video biasa ↔ Shorts). */
  pasangan?: string;
  naskah?: Naskah;
  review?: Review;
  jumlahRevisi: number;
  feedbackManusia?: string;
  adegan?: Adegan[];
  metadata?: MetadataYouTube;
  /** Teks ayat + visual (hanya untuk jenis hafalan) */
  hafalan?: { namaSurat: string; artiSurat: string; ayat: AyatHafalan[]; mulaiSegmen?: number[] };
  /** Path relatif ke packages/video/public, contoh "audio/abc.mp3" */
  fileAudio?: string;
  /** Rekaman yang dikirim per bagian (berurutan); digabung jadi fileAudio saat render. */
  bagianAudio?: string[];
  /** 'urut' (default): satu rekaman/bagian berurutan. 'per-adegan': satu file per adegan (hafalan: per ayat). */
  modeRekam?: ModeRekam;
  /** Rekaman per adegan/ayat, sesuai indeks adegan (cerita) atau ayat (hafalan). */
  audioPerAdegan?: (string | null)[];
  render?: { video: string; thumbnail?: string; waktu: string };
  youtube?: { videoId: string; url: string; jadwalTayang?: string };
  log: LogEntry[];
}

/** Props yang dikirim ke komposisi Remotion. */
export interface EpisodeVideoProps {
  [key: string]: unknown;
  namaChannel: string;
  judul: string;
  namaSeri: string;
  adegan: Adegan[];
  fileAudio?: string;
  /** Detik mulai tiap adegan di fileAudio (rekaman per adegan); durasi adegan ikut persis. */
  mulaiAdegan?: number[];
  format?: Format;
  /** Diisi untuk video hafalan; adegan cerita diabaikan. */
  hafalan?: HafalanVideo;
  /** Musik pembuka & penutup dari pengaturan channel. */
  musik?: MusikVideo;
  /** Diisi otomatis oleh calculateMetadata. */
  frameAdegan?: number[];
  frameIntro?: number;
  frameOutro?: number;
}

export type ModeRekam = 'urut' | 'per-adegan';

export interface MusikVideo {
  /** path di packages/video/public, misal musik/pembuka.mp3 */
  pembuka?: string;
  penutup?: string;
  /** 0..1 */
  volume: number;
}

export interface ThumbnailProps {
  [key: string]: unknown;
  teks: string;
  /** label kecil di atas teks, misal "Hafalan Surat" */
  subjudul?: string;
  latar: Latar;
  karakter: Karakter[];
  ekspresi: Ekspresi;
}

export interface KantorConfig {
  namaChannel: string;
  bahasa: string;
  seri: { id: string; nama: string; usia: Usia; playlistId?: string }[];
  maksRevisiOtomatis: number;
  jamTayangDefault: string;
  zonaWaktu: string;
  musik?: MusikVideo & {
    /** dipakai juga di Shorts (intro/outro Shorts dibatasi supaya tetap < 60 detik) */
    diShorts: boolean;
  };
}
