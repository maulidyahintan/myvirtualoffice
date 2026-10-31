import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, getEpisode, paths, rootDir, setStatus, BUSY_STATUSES } from '@kantor/shared';

/**
 * Jalankan perintah CLI kantor di belakang layar (proses terpisah),
 * supaya dashboard tetap responsif walau agen bekerja beberapa menit.
 * Output ditulis ke data/logs/<nama>.log
 */
export function runOfficeCommand(args: string[], episodeId?: string) {
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
      if (BUSY_STATUSES.includes(ep.status)) {
        setStatus(episodeId, 'error', 'dashboard', `Proses berhenti (kode ${code}). Lihat data/logs/${episodeId}.log`);
      }
    } catch {
      /* abaikan */
    }
  });
  child.unref();
}

export { localToIso } from '@kantor/shared';
