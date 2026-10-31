// Simple file-based JSON storage in data/ folder.
// Intentionally no database to be free, easy to read, and can be committed to git.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ChatAgent, Episode, EpisodeStatus, Idea, AppConfig, ChatMessage, DailyResearch } from './types.ts';
import { voiceFilter, DEFAULT_MEMORIZATION_VOICE, DEFAULT_CHARACTER_VOICE, type SPEAKERS } from './constants.ts';

let rootCache: string | undefined;

/** Find project root folder (containing kantor.config.json). */
export function rootDir(): string {
  if (rootCache) return rootCache;
  if (process.env.KANTOR_ROOT) return (rootCache = process.env.KANTOR_ROOT);
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, 'kantor.config.json'))) return (rootCache = dir);
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('kantor.config.json not found. Run from within project folder.');
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

export function loadConfig(): AppConfig {
  return JSON.parse(fs.readFileSync(path.join(rootDir(), 'kantor.config.json'), 'utf8'));
}

/** Voice settings for one speaker: from kantor.config.json, or default. */
export function speakerVoice(speaker: string, cfg: AppConfig = loadConfig()): { pitch: number; tempo: number } {
  const p = speaker as (typeof SPEAKERS)[number];
  const def = DEFAULT_CHARACTER_VOICE[p] ?? DEFAULT_CHARACTER_VOICE.narrator;
  return { pitch: def.pitch, tempo: def.tempo, ...cfg.characterVoices?.[p] };
}

/** Voice settings for memorization recitation: from kantor.config.json, or default. */
export function memorizationVoice(cfg: AppConfig = loadConfig()): { pitch: number; tempo: number } {
  return { pitch: DEFAULT_MEMORIZATION_VOICE.pitch, tempo: DEFAULT_MEMORIZATION_VOICE.tempo, ...cfg.memorizationVoice };
}

/** Voice effect filter for entire memorization video recording (undefined = original voice). */
export function memorizationFilter(ep: Episode, cfg: AppConfig = loadConfig()): string | undefined {
  return ep.idea.type === 'memorization' && ep.characterEffects !== false ? voiceFilter(memorizationVoice(cfg)) : undefined;
}

export const DEFAULT_DAILY_RESEARCH: DailyResearch = { active: true, time: '07:00', ideaCount: 4 };

export function dailyResearchSettings(cfg: AppConfig = loadConfig()): DailyResearch {
  return { ...DEFAULT_DAILY_RESEARCH, ...cfg.dailyResearch };
}

/** Last automation research note (data/otomatis.json). */
export interface AutomationState {
  /** Local date "YYYY-MM-DD" of last daily research attempt */
  date?: string;
  attempts?: number;
  result?: 'running' | 'ok' | 'failed';
  message?: string;
  time?: string;
}

/** Launchd scheduler file (macOS) for daily research. */
export const dailySchedulerFile = () => path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.tasnie.kantor.riset-harian.plist');

const automationFile = () => path.join(paths.data(), 'otomatis.json');

export function readAutomationState(): AutomationState {
  try {
    return JSON.parse(fs.readFileSync(automationFile(), 'utf8'));
  } catch {
    return {};
  }
}

export function saveAutomationState(c: AutomationState) {
  fs.writeFileSync(automationFile(), JSON.stringify(c, null, 2) + '\n');
}

/** Vertical video length limit to still be considered Shorts by YouTube (3 minutes, with buffer). */
export const SHORTS_LIMIT_SECONDS = 170;

/** Content duration (scenes, without intro/outro) from render result, in seconds. */
export function contentDuration(ep: Episode): number | undefined {
  const a = ep.render?.scenes;
  if (!a?.length) return undefined;
  return a.at(-1)!.start + a.at(-1)!.duration - a[0].start;
}

/** Default number of Shorts from long video: ±1 per 3 minutes, 1–3 Shorts (8 min → 3, 5 min → 2). */
export function autoShortsCount(seconds: number | undefined): number {
  return Math.min(3, Math.max(1, Math.round((seconds ?? 180) / 180)));
}

/** Default playlists: memorization → "Hafalan", Asbabun Nuzul → "Asbabun Nuzul", other series → "Obrolan Islami Anak". */
export const DEFAULT_PLAYLISTS = ['Hafalan', 'Asbabun Nuzul', 'Obrolan Islami Anak'] as const;

/** YouTube playlist name destination for an episode (can be configured per series in Settings). */
export function playlistName(ep: Episode, cfg: AppConfig = loadConfig()): string {
  if (ep.idea.type === 'memorization' && ep.idea.series !== 'hafalan') return seriesPlaylist('hafalan', cfg);
  return seriesPlaylist(ep.idea.series, cfg);
}

/** Playlist name for one series: configured in Settings, or default. */
export function seriesPlaylist(series: string, cfg: AppConfig = loadConfig()): string {
  const custom = cfg.series.find((s) => s.id === series)?.playlist?.trim();
  if (custom) return custom;
  if (series === 'hafalan') return 'Hafalan';
  if (series === 'asbabun-nuzul') return 'Asbabun Nuzul';
  return 'Obrolan Islami Anak';
}

export function saveConfig(cfg: AppConfig) {
  fs.writeFileSync(path.join(rootDir(), 'kantor.config.json'), JSON.stringify(cfg, null, 2) + '\n');
}

function fileOf(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid episode ID: ${id}`);
  return path.join(ensure(paths.episodes()), `${id}.json`);
}

export function listEpisodes(): Episode[] {
  const dir = ensure(paths.episodes());
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Episode)
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

export function getEpisode(id: string): Episode {
  const f = fileOf(id);
  if (!fs.existsSync(f)) throw new Error(`Episode ${id} not found`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

export function saveEpisode(ep: Episode): Episode {
  ep.modified = new Date().toISOString();
  const f = fileOf(ep.id);
  const tmp = `${f}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ep, null, 2));
  fs.renameSync(tmp, f); // Atomic write so dashboard doesn't read half-written file
  return ep;
}

export function updateEpisode(id: string, fn: (ep: Episode) => void): Episode {
  const ep = getEpisode(id);
  fn(ep);
  return saveEpisode(ep);
}

export function setStatus(id: string, status: EpisodeStatus, by: string, message?: string): Episode {
  return updateEpisode(id, (ep) => {
    ep.status = status;
    ep.statusNote = message;
    ep.log.push({ time: new Date().toISOString(), by, message: message ?? `Status → ${status}` });
  });
}

export function addLog(id: string, by: string, message: string) {
  updateEpisode(id, (ep) => {
    ep.log.push({ time: new Date().toISOString(), by, message });
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

export function createEpisodeFromIdea(idea: Idea, by = 'riset'): Episode {
  const now = new Date().toISOString();
  const id = `${slug(idea.title) || 'episode'}-${crypto.randomBytes(2).toString('hex')}`;
  return saveEpisode({
    id,
    created: now,
    modified: now,
    status: 'idea',
    idea,
    revisionCount: 0,
    log: [{ time: now, by, message: 'Idea created' }],
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

// ---- Busy markers for non-episode work (research/reports) that is running ----
const markerFile = (name: string) => path.join(ensure(paths.logs()), `${name}.running`);

export function markBusy(name: string) {
  fs.writeFileSync(markerFile(name), String(process.pid));
}

export function markDone(name: string) {
  fs.rmSync(markerFile(name), { force: true });
}

export function isBusy(name: string): boolean {
  const f = markerFile(name);
  if (!fs.existsSync(f)) return false;
  const pid = Number(fs.readFileSync(f, 'utf8'));
  try {
    process.kill(pid, 0); // Check if process still alive
    return true;
  } catch {
    fs.rmSync(f, { force: true });
    return false;
  }
}

// ---- Channel owner conversation with each agent (data/chat/<agent>.json) ----
const chatFile = (agent: ChatAgent) => path.join(ensure(paths.chat()), `${agent}.json`);

export function readChat(agent: ChatAgent): ChatMessage[] {
  const f = chatFile(agent);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as ChatMessage[]) : [];
}

export function addChatMessage(agent: ChatAgent, message: Omit<ChatMessage, 'time'>): ChatMessage {
  const newMsg = { time: new Date().toISOString(), ...message };
  fs.writeFileSync(chatFile(agent), JSON.stringify([...readChat(agent), newMsg], null, 2));
  return newMsg;
}

export function deleteChat(agent: ChatAgent) {
  fs.rmSync(chatFile(agent), { force: true });
}
