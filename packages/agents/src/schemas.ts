import { z } from 'zod';
import { AKSI, BENDA, EKSPRESI, FORMAT, JENIS_ADEGAN, KARAKTER, LATAR, PROPERTI, SUASANA, USIA } from '@kantor/shared/constants';

const pembicara = z.enum([...KARAKTER, 'narator']);

export const IdeSchema = z.object({
  judul: z.string(),
  seri: z.string().describe('id seri dari kantor.config.json'),
  usia: z.enum(USIA),
  pesanMoral: z.string(),
  format: z.enum(FORMAT).describe("'biasa' = video 16:9 3–5 menit, 'short' = YouTube Shorts vertikal < 60 detik"),
  alasan: z.string().describe('alasan berbasis data riset'),
  referensi: z.array(z.string()),
});

/** Hasil riset dengan minimal `minIde` ide. */
export const risetSchema = (minIde = 3) =>
  z.object({
    laporan: z.string().describe('laporan riset dalam Markdown'),
    ide: z.array(IdeSchema).min(minIde).max(Math.max(5, minIde + 2)),
  });

export const DalilSchema = z.object({
  jenis: z.enum(['ayat', 'hadits', 'doa', 'atsar']),
  teksArab: z.string().optional(),
  latin: z.string().optional(),
  terjemah: z.string(),
  sumber: z.string(),
});

export const NaskahSchema = z.object({
  judul: z.string(),
  ringkasan: z.string(),
  adegan: z
    .array(
      z.object({
        jenis: z.enum(JENIS_ADEGAN),
        pembicara,
        narasi: z.string(),
        petunjukVisual: z.string(),
      }),
    )
    .min(3)
    .max(16),
  dalil: z.array(DalilSchema),
});

export const ReviewSchema = z.object({
  keputusan: z.enum(['lolos', 'revisi']),
  skor: z.number().min(1).max(10),
  catatan: z.array(z.string()),
  cekManusia: z.array(z.string()),
});

export const AdeganSchema = z.object({
  jenis: z.enum(JENIS_ADEGAN),
  pembicara,
  narasi: z.string(),
  latar: z.enum(LATAR),
  karakter: z.array(z.enum(KARAKTER)).max(3),
  ekspresi: z.enum(EKSPRESI),
  teksLayar: z.string().optional(),
  doa: z.object({ arab: z.string(), latin: z.string(), arti: z.string() }).optional(),
  properti: z.array(z.enum(PROPERTI)).max(3).optional().describe('properti pendukung di sekitar tokoh'),
  aksi: z
    .array(z.object({ karakter: z.enum(KARAKTER), aksi: z.enum(AKSI), benda: z.enum(BENDA).optional() }))
    .max(3)
    .optional()
    .describe('apa yang sedang dilakukan tokoh di adegan ini'),
});

export const SutradaraSchema = z.object({ adegan: z.array(AdeganSchema) });

export const MetadataSchema = z.object({
  judul: z.string().max(100),
  deskripsi: z.string(),
  tags: z.array(z.string()),
  teksThumbnail: z.string(),
});

export const RencanaTayangSchema = z.object({
  videoPerHari: z.number().int().min(1).max(6).describe('maksimal video tayang per hari, semua format'),
  hari: z.array(z.number().int().min(0).max(6)).min(1).describe('hari tayang, 0 = Minggu … 6 = Sabtu'),
  slot: z
    .array(
      z.object({
        jam: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe('HH:mm, zona waktu channel'),
        format: z.enum(['biasa', 'short', 'semua']),
      }),
    )
    .min(1)
    .max(8),
  alasan: z.string().describe('penjelasan untuk pemilik channel, Markdown'),
});

export const LaporanSchema = z.object({
  laporan: z.string().describe('laporan performa dalam Markdown'),
});

/** Ilustrator hafalan: memilih latar & suasana yang sesuai arti tiap ayat. */
export const IlustratorSchema = z.object({
  visual: z.array(
    z.object({
      nomor: z.number().describe('nomor ayat (0 = basmalah)'),
      latar: z.enum(LATAR),
      suasana: z.array(z.enum(SUASANA)).max(2),
    }),
  ),
});
