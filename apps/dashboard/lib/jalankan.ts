import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, getEpisode, paths, rootDir, setStatus, STATUS_SIBUK } from '@kantor/shared';

/**
 * Jalankan perintah CLI kantor di belakang layar (proses terpisah),
 * supaya dashboard tetap responsif walau agen bekerja beberapa menit.
 * Output ditulis ke data/logs/<nama>.log
 */
export function jalankanKantor(args: string[], episodeId?: string) {
  const root = rootDir();
  const logFile = path.join(ensureDir(paths.logs()), `${episodeId ?? args[0]}.log`);
  const out = fs.openSync(logFile, 'a');
  fs.writeSync(out, `\n=== ${new Date().toISOString()} :: ${args.join(' ')} ===\n`);

  const child = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'packages/agents/src/cli.ts'), ...args], {
    cwd: root,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, KANTOR_ROOT: root },
  });

  child.on('exit', (code) => {
    fs.closeSync(out);
    if (code === 0 || !episodeId) return;
    try {
      // kalau proses mati sebelum sempat mencatat error, jangan biarkan episode "sibuk" selamanya
      const ep = getEpisode(episodeId);
      if (STATUS_SIBUK.includes(ep.status)) {
        setStatus(episodeId, 'error', 'dashboard', `Proses berhenti (kode ${code}). Lihat data/logs/${episodeId}.log`);
      }
    } catch {
      /* abaikan */
    }
  });
  child.unref();
}

/** "2026-11-01T16:30" (jam lokal di zona tertentu) → ISO UTC */
export function lokalKeIso(lokal: string, zona: string): string {
  const kiraUtc = new Date(`${lokal}:00Z`);
  const offsetTeks =
    new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
      .formatToParts(kiraUtc)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = offsetTeks.match(/GMT([+-])(\d{2}):(\d{2})/);
  const menit = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(kiraUtc.getTime() - menit * 60_000).toISOString();
}
