// The free Gemini TTS quota is counted per day in Pacific time: it refills at midnight in Los Angeles
// (15:00 WIB in winter, 14:00 WIB during US daylight saving time). Date math here is pure and tested.
import fs from 'node:fs';
import path from 'node:path';
import { paths, writeJsonAtomic } from './store.ts';

/** Google resets the Gemini API daily quotas at midnight Pacific time. */
export const QUOTA_TIME_ZONE = 'America/Los_Angeles';
const MS_PER_DAY = 86_400_000;

export interface AiVoiceUsage {
  /** Quota day "YYYY-MM-DD" in Pacific time. */
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

/** Calendar date ("YYYY-MM-DD") of an instant in a time zone. */
export function dateInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** How far a time zone is ahead of UTC at an instant, in milliseconds (negative for the Americas). */
function zoneOffset(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(instant)
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant a local date starts (00:00) in a time zone, daylight saving time included. */
export function midnightInZone(date: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - zoneOffset(new Date(guess), timeZone);
  // the offset can differ at the real midnight when daylight saving time changes that day
  return new Date(guess - zoneOffset(new Date(first), timeZone));
}

/** Quota day an instant belongs to. */
export function quotaDay(now = new Date()): string {
  return dateInZone(now, QUOTA_TIME_ZONE);
}

/** When the free quota refills next (the coming midnight in Pacific time). */
export function nextQuotaReset(now = new Date()): Date {
  const today = midnightInZone(quotaDay(now), QUOTA_TIME_ZONE);
  // noon of the next day is always in the next date, whatever the daylight saving shift
  return midnightInZone(quotaDay(new Date(today.getTime() + MS_PER_DAY + MS_PER_DAY / 2)), QUOTA_TIME_ZONE);
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

/** "±2 jam 15 menit" / "±40 menit" until an instant. */
export function formatWait(from: Date, to: Date): string {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / MS_PER_MINUTE));
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  if (!hours) return `±${rest} menit`;
  return rest ? `±${hours} jam ${rest} menit` : `±${hours} jam`;
}

/**
 * When the quota refills, for the owner: "hari ini pukul 15.00 WIB (±2 jam lagi)" or
 * "besok pukul 15.00 WIB (±20 jam lagi)", in the channel's time zone.
 */
export function quotaResetText(now: Date, timeZone: string): string {
  const reset = nextQuotaReset(now);
  const time = new Intl.DateTimeFormat('id-ID', { timeZone, hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(reset);
  const sameDay = dateInZone(reset, timeZone) === dateInZone(now, timeZone);
  return `${sameDay ? 'hari ini' : 'besok'} pukul ${time} (${formatWait(now, reset)} lagi)`;
}

const usageFile = () => path.join(paths.data(), 'suara-ai.json');

/** Today's AI voice usage; a file from an earlier quota day counts as a fresh day (the model is kept). */
export function aiVoiceUsage(now = new Date()): AiVoiceUsage {
  const today = quotaDay(now);
  try {
    const usage = JSON.parse(fs.readFileSync(usageFile(), 'utf8')) as AiVoiceUsage;
    return usage.date === today ? usage : { date: today, requests: 0, characters: 0, model: usage.model };
  } catch {
    // no usage yet (or an unreadable file): a fresh day
    return { date: today, requests: 0, characters: 0 };
  }
}

export function saveAiVoiceUsage(usage: AiVoiceUsage): void {
  writeJsonAtomic(usageFile(), usage);
}
