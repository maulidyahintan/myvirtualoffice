// Daftar "pegawai" kantor 3D. Ganti nama, warna, atau posisi meja di sini.
// posisi = [x, z] di lantai (lantai: x -8..8, z -6..6). Karakter menghadap +z (ke arah kamera).

export type PegawaiId = 'manajer' | 'riset' | 'penulis' | 'reviewer' | 'sutradara' | 'channel';

export interface PegawaiDef {
  id: PegawaiId;
  nama: string;
  peran: string;
  gaya: 'peci' | 'kerudung';
  warnaBaju: string;
  /** warna kerudung atau peci */
  warnaAksen: string;
  /** warna cahaya layar monitor saat bekerja */
  warnaLayar: string;
  posisi: [number, number];
  /** nilai `oleh` di log episode yang dianggap pekerjaan pegawai ini */
  logOleh: string[];
}

export const PEGAWAI: PegawaiDef[] = [
  {
    id: 'manajer',
    nama: 'Mochi',
    peran: 'Manajer (Orchestrator)',
    gaya: 'peci',
    warnaBaju: '#4F8A6E',
    warnaAksen: '#2B2B2B',
    warnaLayar: '#8FE3B8',
    posisi: [5.6, -4.1],
    logOleh: ['orchestrator', 'dashboard'],
  },
  {
    id: 'riset',
    nama: 'Miku',
    peran: 'Content Research',
    gaya: 'kerudung',
    warnaBaju: '#7FB7C9',
    warnaAksen: '#2F7F86',
    warnaLayar: '#9EE7F0',
    posisi: [-6.0, -3.4],
    logOleh: ['riset'],
  },
  {
    id: 'penulis',
    nama: 'Chimi',
    peran: 'Content Specialist (Penulis)',
    gaya: 'kerudung',
    warnaBaju: '#E9A2B8',
    warnaAksen: '#C2577E',
    warnaLayar: '#FFC9DA',
    posisi: [-2.6, -3.4],
    logOleh: ['penulis'],
  },
  {
    id: 'reviewer',
    nama: 'Choki',
    peran: 'Kids & Syariah Reviewer',
    gaya: 'peci',
    warnaBaju: '#6C8FD6',
    warnaAksen: '#1F2A44',
    warnaLayar: '#B9CCFF',
    posisi: [0.9, -3.4],
    logOleh: ['reviewer'],
  },
  {
    id: 'sutradara',
    nama: 'Momo',
    peran: 'Video Creator (Sutradara)',
    gaya: 'peci',
    warnaBaju: '#E7A54B',
    warnaAksen: '#3A2E2A',
    warnaLayar: '#FFE0A3',
    posisi: [-6.0, 1.2],
    logOleh: ['sutradara', 'video-creator'],
  },
  {
    id: 'channel',
    nama: 'Lulu',
    peran: 'Channel Manager',
    gaya: 'kerudung',
    warnaBaju: '#A99BE0',
    warnaAksen: '#5B4AA8',
    warnaLayar: '#D9D1FF',
    posisi: [-2.6, 1.2],
    logOleh: ['channel-manager'],
  },
];

export type Keadaan = 'kerja' | 'tunggu' | 'santai';

export interface Aktivitas {
  waktu: string;
  pesan: string;
  episodeId?: string;
  judul?: string;
}

export interface StatusPegawai {
  id: PegawaiId;
  keadaan: Keadaan;
  pesan: string;
  episodeId?: string;
  aktivitas: Aktivitas[];
}

export interface DataKantor {
  pegawai: StatusPegawai[];
  /** jumlah episode per fase (untuk papan tulis) */
  fase: { judul: string; jumlah: number }[];
  menungguKamu: { id: string; judul: string; label: string }[];
  diperbarui: string;
}
