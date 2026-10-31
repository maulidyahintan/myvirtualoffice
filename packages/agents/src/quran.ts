// Quranic text fetched from equran.id (Arabic text, latin, & translation from Indonesian Ministry of Religious Affairs).
// Verse text is NEVER written by AI to avoid errors in letters/diacritics.

const API = 'https://equran.id/api/v2';

export interface VerseApi {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
}

export interface SurahApi {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  arti: string;
  ayat: VerseApi[];
}

export const BASMALAH = {
  arabic: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
  latin: 'Bismillāhir-raḥmānir-raḥīm(i).',
  meaning: 'Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.',
};

export async function fetchSurah(number: number): Promise<SurahApi> {
  if (!Number.isInteger(number) || number < 1 || number > 114) throw new Error(`Nomor surat tidak valid: ${number}`);
  const res = await fetch(`${API}/surat/${number}`);
  if (!res.ok) throw new Error(`Gagal mengambil surat ${number} dari equran.id (HTTP ${res.status})`);
  const json = (await res.json()) as { data: SurahApi };
  return json.data;
}

export async function fetchSurahList(): Promise<Omit<SurahApi, 'ayat'>[]> {
  const res = await fetch(`${API}/surat`);
  if (!res.ok) throw new Error(`Gagal mengambil daftar surat (HTTP ${res.status})`);
  return ((await res.json()) as { data: Omit<SurahApi, 'ayat'>[] }).data;
}
