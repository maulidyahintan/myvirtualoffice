// Penyimpanan sederhana berbasis file JSON di folder data/.
// Sengaja tanpa database supaya gratis, mudah dibaca, dan bisa di-commit ke git.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AgenChat, Episode, EpisodeStatus, Ide, KantorConfig, PesanChat, RisetHarian } from './types.ts';
import { filterSuara, SUARA_HAFALAN_BAWAAN, SUARA_KARAKTER_BAWAAN, type PEMBICARA } from './constants.ts';

let rootCache: string | undefined;

/** Cari folder root proyek (yang berisi kantor.config.json). */
export function rootDir(): string {
  if (rootCache) return rootCache;
  if (process.env.KANTOR_ROOT) return (rootCache = process.env.KANTOR_ROOT);
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, 'kantor.config.json'))) return (rootCache = dir);
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('kantor.config.json tidak ditemukan. Jalankan dari dalam folder proyek.');
    dir = parent;
  }
}

export const paths = {
  data: () => path.join(rootDir(), 'data'),
  episodes: () => path.join(rootDir(), 'data', 'episodes'),
  riset: () => path.join(rootDir(), 'data', 'riset'),
  laporan: () => path.join(rootDir(), 'data', 'laporan'),
  renders: () => path.join(rootDir(), 'data', 'renders'),
  logs: () => path.join(rootDir(), 'data', 'logs'),
  chat: () => path.join(rootDir(), 'data', 'chat'),
  secrets: () => path.join(rootDir(), 'data', 'secrets'),
  videoPkg: () => path.join(rootDir(), 'packages', 'video'),
  audio: () => path.join(rootDir(), 'packages', 'video', 'public', 'audio'),
  musik: () => path.join(rootDir(), 'packages', 'video', 'public', 'musik'),
  prompts: () => path.join(rootDir(), 'packages', 'agents', 'prompts'),
};

function ensure(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadConfig(): KantorConfig {
  return JSON.parse(fs.readFileSync(path.join(rootDir(), 'kantor.config.json'), 'utf8'));
}

/** Pengaturan suara satu pembicara: dari kantor.config.json, atau bawaan. */
export function suaraPembicara(pembicara: string, cfg: KantorConfig = loadConfig()): { nada: number; tempo: number } {
  const p = pembicara as (typeof PEMBICARA)[number];
  const bawaan = SUARA_KARAKTER_BAWAAN[p] ?? SUARA_KARAKTER_BAWAAN.narator;
  return { nada: bawaan.nada, tempo: bawaan.tempo, ...cfg.suaraKarakter?.[p] };
}

/** Pengaturan suara bacaan hafalan: dari kantor.config.json, atau bawaan. */
export function suaraHafalan(cfg: KantorConfig = loadConfig()): { nada: number; tempo: number } {
  return { nada: SUARA_HAFALAN_BAWAAN.nada, tempo: SUARA_HAFALAN_BAWAAN.tempo, ...cfg.suaraHafalan };
}

/** Filter efek suara seluruh rekaman video hafalan (undefined = suara asli). */
export function filterHafalan(ep: Episode, cfg: KantorConfig = loadConfig()): string | undefined {
  return ep.ide.jenis === 'hafalan' && ep.efekKarakter !== false ? filterSuara(suaraHafalan(cfg)) : undefined;
}

export const RISET_HARIAN_BAWAAN: RisetHarian = { aktif: true, jam: '07:00', jumlahIde: 4 };

export function risetHarian(cfg: KantorConfig = loadConfig()): RisetHarian {
  return { ...RISET_HARIAN_BAWAAN, ...cfg.risetHarian };
}

/** Catatan riset otomatis terakhir (data/otomatis.json). */
export interface CatatanOtomatis {
  /** tanggal lokal "YYYY-MM-DD" riset harian terakhir dicoba */
  tanggal?: string;
  percobaan?: number;
  hasil?: 'jalan' | 'ok' | 'gagal';
  pesan?: string;
  waktu?: string;
}

/** File penjadwal launchd (macOS) untuk riset harian. */
export const filePenjadwalHarian = () => path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.tasnie.kantor.riset-harian.plist');

const fileOtomatis = () => path.join(paths.data(), 'otomatis.json');

export function bacaOtomatis(): CatatanOtomatis {
  try {
    return JSON.parse(fs.readFileSync(fileOtomatis(), 'utf8'));
  } catch {
    return {};
  }
}

export function simpanOtomatis(c: CatatanOtomatis) {
  fs.writeFileSync(fileOtomatis(), JSON.stringify(c, null, 2) + '\n');
}

/** Playlist bawaan: hafalan → "Hafalan", Asbabun Nuzul → "Asbabun Nuzul", seri lain → "Obrolan Islami Anak". */
export const PLAYLIST_BAWAAN = ['Hafalan', 'Asbabun Nuzul', 'Obrolan Islami Anak'] as const;

/** Nama playlist YouTube tujuan sebuah episode (bisa diatur per seri di Pengaturan). */
export function namaPlaylist(ep: Episode, cfg: KantorConfig = loadConfig()): string {
  if (ep.ide.jenis === 'hafalan' && ep.ide.seri !== 'hafalan') return playlistSeri('hafalan', cfg);
  return playlistSeri(ep.ide.seri, cfg);
}

/** Nama playlist untuk satu seri: diatur di Pengaturan, atau bawaan. */
export function playlistSeri(seri: string, cfg: KantorConfig = loadConfig()): string {
  const atur = cfg.seri.find((s) => s.id === seri)?.playlist?.trim();
  if (atur) return atur;
  if (seri === 'hafalan') return 'Hafalan';
  if (seri === 'asbabun-nuzul') return 'Asbabun Nuzul';
  return 'Obrolan Islami Anak';
}

export function saveConfig(cfg: KantorConfig) {
  fs.writeFileSync(path.join(rootDir(), 'kantor.config.json'), JSON.stringify(cfg, null, 2) + '\n');
}

function fileOf(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`ID episode tidak valid: ${id}`);
  return path.join(ensure(paths.episodes()), `${id}.json`);
}

export function listEpisodes(): Episode[] {
  const dir = ensure(paths.episodes());
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Episode)
    .sort((a, b) => b.diubah.localeCompare(a.diubah));
}

export function getEpisode(id: string): Episode {
  const f = fileOf(id);
  if (!fs.existsSync(f)) throw new Error(`Episode ${id} tidak ditemukan`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

export function saveEpisode(ep: Episode): Episode {
  ep.diubah = new Date().toISOString();
  const f = fileOf(ep.id);
  const tmp = `${f}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ep, null, 2));
  fs.renameSync(tmp, f); // tulis atomik supaya dashboard tidak membaca file setengah jadi
  return ep;
}

export function updateEpisode(id: string, fn: (ep: Episode) => void): Episode {
  const ep = getEpisode(id);
  fn(ep);
  return saveEpisode(ep);
}

export function setStatus(id: string, status: EpisodeStatus, oleh: string, pesan?: string): Episode {
  return updateEpisode(id, (ep) => {
    ep.status = status;
    ep.catatanStatus = pesan;
    ep.log.push({ waktu: new Date().toISOString(), oleh, pesan: pesan ?? `Status → ${status}` });
  });
}

export function addLog(id: string, oleh: string, pesan: string) {
  updateEpisode(id, (ep) => {
    ep.log.push({ waktu: new Date().toISOString(), oleh, pesan });
  });
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function createEpisodeFromIdea(ide: Ide, oleh = 'riset'): Episode {
  const now = new Date().toISOString();
  const id = `${slug(ide.judul) || 'episode'}-${crypto.randomBytes(2).toString('hex')}`;
  return saveEpisode({
    id,
    dibuat: now,
    diubah: now,
    status: 'idea',
    ide,
    jumlahRevisi: 0,
    log: [{ waktu: now, oleh, pesan: 'Ide dibuat' }],
  });
}

export function writeDated(dir: string, prefix: string, content: string): string {
  ensure(dir);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const f = path.join(dir, `${prefix}-${stamp}.md`);
  fs.writeFileSync(f, content);
  return f;
}

export function latestFile(dir: string): { file: string; isi: string } | undefined {
  if (!fs.existsSync(dir)) return undefined;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const last = files.at(-1);
  if (!last) return undefined;
  const file = path.join(dir, last);
  return { file, isi: fs.readFileSync(file, 'utf8') };
}

export { ensure as ensureDir };

// ---- penanda pekerjaan tanpa episode (riset/laporan) yang sedang berjalan ----
const penanda = (nama: string) => path.join(ensure(paths.logs()), `${nama}.running`);

export function tandaiSibuk(nama: string) {
  fs.writeFileSync(penanda(nama), String(process.pid));
}

export function tandaiSelesai(nama: string) {
  fs.rmSync(penanda(nama), { force: true });
}

export function sedangSibuk(nama: string): boolean {
  const f = penanda(nama);
  if (!fs.existsSync(f)) return false;
  const pid = Number(fs.readFileSync(f, 'utf8'));
  try {
    process.kill(pid, 0); // cek proses masih hidup
    return true;
  } catch {
    fs.rmSync(f, { force: true });
    return false;
  }
}

// ---- percakapan pemilik channel dengan tiap agen (data/chat/<agen>.json) ----
const fileChat = (agen: AgenChat) => path.join(ensure(paths.chat()), `${agen}.json`);

export function bacaChat(agen: AgenChat): PesanChat[] {
  const f = fileChat(agen);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as PesanChat[]) : [];
}

export function tambahChat(agen: AgenChat, pesan: Omit<PesanChat, 'waktu'>): PesanChat {
  const baru = { waktu: new Date().toISOString(), ...pesan };
  fs.writeFileSync(fileChat(agen), JSON.stringify([...bacaChat(agen), baru], null, 2));
  return baru;
}

export function hapusChat(agen: AgenChat) {
  fs.rmSync(fileChat(agen), { force: true });
}
