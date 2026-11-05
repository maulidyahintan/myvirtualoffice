// Ilustrasi AI gratis: Cloudflare Workers AI (FLUX) dengan akun paket Free. Paket Free tidak bisa
// ditagih — kalau jatah harian (10.000 neuron) habis, Cloudflare menolak dan adegan sisanya
// memakai animasi biasa.
import fs from 'node:fs';
import path from 'node:path';
import { paths, writeJsonAtomic } from '@kantor/shared';

/** FLUX.2 klein: wide 16:9 pictures in a soft style that sits well next to our characters. */
const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const WIDTH = 1280;
const HEIGHT = 720;

/** Added to every picture so all illustrations share one look that sits well next to our characters. */
const STYLE =
  "Soft 2D children's picture book illustration, flat pastel colors, gentle warm lighting, simple rounded shapes, " +
  'calm and friendly mood, wide 16:9 composition. Completely empty of people: no humans, no human figures, no silhouettes, ' +
  'no faces, no hands. No text, no letters.';

/** Daily free quota used up, or the account can't use Workers AI: stop, the rest stays animated. */
export class IllustrationUnavailable extends Error {}

interface Usage {
  /** "YYYY-MM-DD" UTC — Cloudflare's free allocation resets at 00:00 UTC */
  date: string;
  images: number;
  exhaustedAt?: string;
}

const usageFile = () => path.join(paths.data(), 'ilustrasi-ai.json');

export function illustrationUsage(): Usage {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const u = JSON.parse(fs.readFileSync(usageFile(), 'utf8')) as Usage;
    return u.date === today ? u : { date: today, images: 0 };
  } catch {
    return { date: today, images: 0 };
  }
}

export function illustrationReady(): boolean {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim());
}

/** Generate one picture; returns JPEG bytes. */
export async function drawPicture(prompt: string): Promise<Buffer> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!account || !token) throw new IllustrationUnavailable('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN belum diisi di .env');
  const usage = illustrationUsage();
  if (usage.exhaustedAt) throw new IllustrationUnavailable('Jatah ilustrasi AI gratis hari ini sudah habis');

  const model = process.env.CLOUDFLARE_IMAGE_MODEL?.trim() || MODEL;
  const text = `${prompt.trim()} ${STYLE}`;
  // FLUX.2 takes multipart form fields (with an exact size); FLUX.1 schnell takes JSON (always square)
  let body: FormData | string;
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (model.includes('flux-2')) {
    body = new FormData();
    body.set('prompt', text);
    body.set('width', String(WIDTH));
    body.set('height', String(HEIGHT));
  } else {
    body = JSON.stringify({ prompt: text, steps: 8 });
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, { method: 'POST', headers, body });
  const raw = await res.text();
  let data: { success?: boolean; result?: { image?: string }; errors?: { code?: number; message?: string }[] } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* non-JSON error page */
  }
  const image = data.result?.image;
  if (res.ok && image) {
    writeJsonAtomic(usageFile(), { ...usage, images: usage.images + 1 });
    return Buffer.from(image, 'base64');
  }
  const message = data.errors?.map((e) => e.message).join('; ') || raw.slice(0, 200);
  // 4006 = daily free allocation used up
  if (res.status === 429 || data.errors?.some((e) => e.code === 4006) || /allocation|neurons|limit/i.test(message)) {
    writeJsonAtomic(usageFile(), { ...usage, exhaustedAt: new Date().toISOString() });
    throw new IllustrationUnavailable('Jatah ilustrasi AI gratis hari ini sudah habis');
  }
  if (res.status === 401 || res.status === 403) throw new IllustrationUnavailable(`Akun Cloudflare menolak: ${message}`);
  throw new Error(`Ilustrasi AI gagal (${res.status}): ${message}`);
}
