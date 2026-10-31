// Pekerjaan otomatis tanpa disuruh: Content Research mencari ide setiap hari.
// launchd (macOS) menjalankan `kantor harian` tiap 30 menit; riset hanya jalan sekali per hari,
// pertama kali setelah jam yang diatur. Mac yang tidur saat jam itu tetap riset begitu bangun.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  readAutomationState,
  dailySchedulerFile,
  isoToLocal,
  loadConfig,
  paths,
  dailyResearchSettings,
  rootDir,
  isBusy,
  saveAutomationState,
  markDone,
  markBusy,
} from '@kantor/shared';
import { riset } from './workflow.ts';

const MAKS_PERCOBAAN = 2;
const filePenjadwal = dailySchedulerFile;
const LABEL = path.basename(filePenjadwal(), '.plist');

/** Jalankan riset harian kalau sudah lewat jamnya dan hari ini belum. */
export async function dailyResearchSettingsJikaPerlu() {
  const atur = dailyResearchSettings();
  if (!atur.active) return console.log('Riset harian nonaktif');
  const cfg = loadConfig();
  const sekarang = isoToLocal(new Date().toISOString(), cfg.timeZone);
  const [tanggal, jam] = sekarang.split('T');
  if (jam < atur.time) return console.log(`Belum jam ${atur.time}`);

  const c = readAutomationState();
  const hariIni = c.date === tanggal;
  // 'jalan' tanpa proses riset yang hidup = proses sebelumnya mati di tengah jalan
  if (hariIni && (c.result === 'ok' || (c.result === 'jalan' && isBusy('riset')))) return console.log('Riset hari ini sudah jalan');
  if (hariIni && (c.attempts ?? 0) >= MAKS_PERCOBAAN) return console.log('Riset hari ini sudah gagal 2x, dicoba lagi besok');
  if (isBusy('riset')) return console.log('Riset lain sedang berjalan');

  const percobaan = hariIni ? (c.attempts ?? 0) + 1 : 1;
  saveAutomationState({ tanggal, percobaan, hasil: 'jalan', waktu: new Date().toISOString() });
  markBusy('riset');
  try {
    const { episodes } = await riset(undefined, atur.ideaCount);
    saveAutomationState({ tanggal, percobaan, hasil: 'ok', pesan: `${episodes.length} ide baru`, waktu: new Date().toISOString() });
  } catch (e) {
    saveAutomationState({ tanggal, percobaan, hasil: 'gagal', pesan: (e as Error).message.slice(0, 300), waktu: new Date().toISOString() });
    throw e;
  } finally {
    markDone('riset');
  }
}

/** Pasang penjadwal launchd (tiap 30 menit + saat login). Aman dijalankan ulang. */
export function pasangPenjadwal() {
  const root = rootDir();
  const node = process.execPath;
  const log = path.join(paths.logs(), 'harian.log');
  fs.mkdirSync(paths.logs(), { recursive: true });
  const teks = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${teks(node)}</string>
    <string>--import</string>
    <string>tsx</string>
    <string>${teks(path.join(root, 'packages/agents/src/cli.ts'))}</string>
    <string>harian</string>
  </array>
  <key>WorkingDirectory</key><string>${teks(root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>KANTOR_ROOT</key><string>${teks(root)}</string>
    <key>PATH</key><string>${teks(path.dirname(node))}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartInterval</key><integer>1800</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${teks(log)}</string>
  <key>StandardErrorPath</key><string>${teks(log)}</string>
</dict>
</plist>
`;
  fs.mkdirSync(path.dirname(filePenjadwal()), { recursive: true });
  fs.writeFileSync(filePenjadwal(), plist);
  const domain = `gui/${os.userInfo().uid}`;
  try {
    execFileSync('launchctl', ['bootout', domain, filePenjadwal()], { stdio: 'ignore' });
  } catch {
    /* belum terpasang */
  }
  execFileSync('launchctl', ['bootstrap', domain, filePenjadwal()]);
  console.log(`✅ Penjadwal terpasang: ${filePenjadwal()}`);
}

export function lepasPenjadwal() {
  try {
    execFileSync('launchctl', ['bootout', `gui/${os.userInfo().uid}`, filePenjadwal()], { stdio: 'ignore' });
  } catch {
    /* sudah tidak jalan */
  }
  fs.rmSync(filePenjadwal(), { force: true });
  console.log('✅ Penjadwal dilepas');
}
