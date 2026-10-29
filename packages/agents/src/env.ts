// Muat .env dari root proyek (Node >= 20.12 punya process.loadEnvFile).
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from '@kantor/shared';

const f = path.join(rootDir(), '.env');
if (fs.existsSync(f)) process.loadEnvFile(f);

// String kosong di .env jangan dianggap "ada API key" — biarkan SDK pakai login langganan.
if (process.env.ANTHROPIC_API_KEY === '') delete process.env.ANTHROPIC_API_KEY;
