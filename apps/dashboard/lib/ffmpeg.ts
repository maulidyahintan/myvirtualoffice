import 'server-only';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { paths } from '@kantor/shared';

/** Olah audio dengan ffmpeg bawaan Remotion; kembalikan hasilnya sebagai wav. */
export function processAudio(masuk: string, filter: string): Promise<Buffer> {
  const keluar = path.join(os.tmpdir(), `kantor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.wav`);
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['--no-install', 'remotion', 'ffmpeg', '-hide_banner', '-y', '-i', masuk, '-af', filter, keluar], {
      cwd: paths.videoPkg(),
      shell: process.platform === 'win32',
    });
    p.on('error', reject);
    p.on('close', () => {
      if (!fs.existsSync(keluar)) return reject(new Error('Gagal mengolah audio'));
      const hasil = fs.readFileSync(keluar);
      fs.rmSync(keluar, { force: true });
      resolve(hasil);
    });
  });
}
