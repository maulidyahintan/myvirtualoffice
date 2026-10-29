// Teks Al-Qur'an diambil dari equran.id (teks Arab, latin, & terjemah Kemenag RI).
// Teks ayat TIDAK PERNAH ditulis oleh AI supaya tidak ada salah huruf/harakat.

const API = 'https://equran.id/api/v2';

export interface AyatApi {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
}

export interface SuratApi {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  arti: string;
  ayat: AyatApi[];
}

export const BASMALAH = {
  arab: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
  latin: 'Bismillāhir-raḥmānir-raḥīm(i).',
  arti: 'Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.',
};

export async function ambilSurat(nomor: number): Promise<SuratApi> {
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > 114) throw new Error(`Nomor surat tidak valid: ${nomor}`);
  const res = await fetch(`${API}/surat/${nomor}`);
  if (!res.ok) throw new Error(`Gagal mengambil surat ${nomor} dari equran.id (HTTP ${res.status})`);
  const json = (await res.json()) as { data: SuratApi };
  return json.data;
}

export async function daftarSurat(): Promise<Omit<SuratApi, 'ayat'>[]> {
  const res = await fetch(`${API}/surat`);
  if (!res.ok) throw new Error(`Gagal mengambil daftar surat (HTTP ${res.status})`);
  return ((await res.json()) as { data: Omit<SuratApi, 'ayat'>[] }).data;
}
