import { z } from 'zod';
import { EKSPRESI, FORMAT, JENIS_ADEGAN, KARAKTER, LATAR, SUASANA, USIA } from '@kantor/shared/constants';

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

export const RisetSchema = z.object({
  laporan: z.string().describe('laporan riset dalam Markdown'),
  ide: z.array(IdeSchema).min(1).max(5),
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
});

export const SutradaraSchema = z.object({ adegan: z.array(AdeganSchema) });

export const MetadataSchema = z.object({
  judul: z.string().max(100),
  deskripsi: z.string(),
  tags: z.array(z.string()),
  teksThumbnail: z.string(),
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
