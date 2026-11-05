// Suara AI gratis: Gemini TTS lewat API key Google AI Studio. Dipakai dengan proyek TANPA akun penagihan,
// jadi tidak pernah ada biaya — kalau jatah gratis habis, Google menolak (429) dan adegan sisanya
// direkam sendiri oleh pemilik channel.
import fs from 'node:fs';
import path from 'node:path';
import { AI_VOICES, paths, writeJsonAtomic, type Speaker } from '@kantor/shared';

/** Newest first; the first one that exists for this key is remembered in the usage file. */
const MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const SAMPLE_RATE = 24_000;

/** Free quota used up (for today) or the key is not allowed to use TTS: stop and record by hand. */
export class AiVoiceUnavailable extends Error {}

interface Usage {
  /** "YYYY-MM-DD" (UTC, the day Google's daily quota resets) */
  date: string;
  requests: number;
  characters: number;
  /** TTS model that worked for this key */
  model?: string;
  /** Models whose daily free quota ran out today (each model has its own quota) */
  exhaustedModels?: string[];
  /** Set when every model's daily free quota ran out */
  exhaustedAt?: string;
}

const usageFile = () => path.join(paths.data(), 'suara-ai.json');

export function aiVoiceUsage(): Usage {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const u = JSON.parse(fs.readFileSync(usageFile(), 'utf8')) as Usage;
    return u.date === today ? u : { date: today, requests: 0, characters: 0, model: u.model };
  } catch {
    return { date: today, requests: 0, characters: 0 };
  }
}

function saveUsage(u: Usage) {
  writeJsonAtomic(usageFile(), u);
}

/** Text as it should be spoken: symbols the voice can't read are written out. */
function spoken(text: string): string {
  return text.replace(/ﷺ/g, "shallallahu 'alaihi wa sallam").replace(/\s+/g, ' ').trim();
}

/** WAV header around raw 16-bit mono PCM (what Gemini TTS returns). */
export function wav(pcm: Buffer): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Speak one scene's narration in the speaker's voice; returns a WAV file. */
export async function speak(text: string, speaker: Speaker): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiVoiceUnavailable('GEMINI_API_KEY belum diisi di .env');
  const usage = aiVoiceUsage();
  if (usage.exhaustedAt) throw new AiVoiceUnavailable('Jatah suara AI gratis hari ini sudah habis');

  const { voice, style } = AI_VOICES[speaker];
  const forced = process.env.GEMINI_TTS_MODEL?.trim();
  const ordered = forced ? [forced] : usage.model ? [usage.model, ...MODELS.filter((m) => m !== usage.model)] : MODELS;
  const models = ordered.filter((m) => !usage.exhaustedModels?.includes(m));
  const body = JSON.stringify({
    contents: [{ parts: [{ text: `${style}: ${spoken(text)}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  });

  for (const model of models) {
    // per-minute limits are short waits; the daily limit means stop for today
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
      });
      const raw = await res.text();
      if (res.ok) {
        const data = JSON.parse(raw) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
        const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
        if (!b64) throw new Error('Suara AI tidak mengembalikan audio');
        const now = aiVoiceUsage();
        saveUsage({ ...now, model, requests: now.requests + 1, characters: now.characters + text.length });
        return wav(Buffer.from(b64, 'base64'));
      }
      if (res.status === 404) break; // model not available for this key → try the next one
      if (res.status === 429) {
        const perDay = /PerDay|per day|daily/i.test(raw);
        const wait = Number(raw.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 30);
        if (!perDay && attempt < 3 && wait <= 90) {
          await sleep((wait + 1) * 1000);
          continue;
        }
        if (perDay) {
          // this model is done for today; the next (older) model has its own free quota
          const now = aiVoiceUsage();
          saveUsage({ ...now, exhaustedModels: [...(now.exhaustedModels ?? []), model] });
          break;
        }
        throw new AiVoiceUnavailable('Suara AI sedang dibatasi Google (terlalu banyak permintaan per menit); coba lagi sebentar lagi');
      }
      if (res.status === 400 || res.status === 403) {
        const msg = (raw.match(/"message":\s*"([^"]+)"/)?.[1] ?? raw).slice(0, 200);
        throw new AiVoiceUnavailable(`Suara AI ditolak Google: ${msg}`);
      }
      throw new Error(`Suara AI gagal (${res.status}): ${raw.slice(0, 200)}`);
    }
  }
  if (aiVoiceUsage().exhaustedModels?.length) {
    saveUsage({ ...aiVoiceUsage(), exhaustedAt: new Date().toISOString() });
    throw new AiVoiceUnavailable('Jatah suara AI gratis hari ini sudah habis (±10 adegan per model per hari)');
  }
  throw new AiVoiceUnavailable('Model suara AI tidak tersedia untuk API key ini');
}
