// Facebook Page connection: the owner's Page and a Page access token, kept in data/secrets (never committed).
// Only Pages can be posted to by apps; personal profiles (also in professional mode) cannot.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, paths, writeJsonAtomic } from './store.ts';
import type { Episode } from './types.ts';

/** Graph API version used for every call (override with FACEBOOK_GRAPH_VERSION when Meta retires it). */
export const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0';
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface FacebookConnection {
  pageId: string;
  pageName: string;
  /** Page access token derived from a long-lived user token: does not expire */
  pageToken: string;
  connectedAt: string;
}

const connectionFile = () => path.join(paths.secrets(), 'facebook.json');

export function facebookConnection(): FacebookConnection | undefined {
  try {
    return JSON.parse(fs.readFileSync(connectionFile(), 'utf8')) as FacebookConnection;
  } catch {
    return undefined;
  }
}

export function disconnectFacebook() {
  fs.rmSync(connectionFile(), { force: true });
}

/** GET/POST a Graph API URL and return its JSON, throwing Meta's own error message on failure. */
export async function graphFetch<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number } } & T;
  if (!res.ok || body.error) throw new Error(`Facebook: ${body.error?.message ?? `HTTP ${res.status}`}`);
  return body;
}

/**
 * Connect the Page: exchange the short-lived user token from Graph API Explorer for a long-lived one, then
 * take that Page's token from /me/accounts (a Page token from a long-lived user token never expires).
 * `page` is the Page id (or empty when the account manages a single Page).
 */
export async function connectFacebook(opts: { appId: string; appSecret: string; userToken: string; page?: string }): Promise<FacebookConnection> {
  const q = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: opts.appId,
    client_secret: opts.appSecret,
    fb_exchange_token: opts.userToken,
  });
  const { access_token: longToken } = await graphFetch<{ access_token: string }>(`${GRAPH}/oauth/access_token?${q}`);
  const { data } = await graphFetch<{ data: { id: string; name: string; access_token: string; tasks?: string[] }[] }>(
    `${GRAPH}/me/accounts?${new URLSearchParams({ fields: 'id,name,access_token,tasks', access_token: longToken })}`,
  );
  const wanted = opts.page?.match(/\d{6,}/)?.[0];
  const page = wanted ? data.find((p) => p.id === wanted) : data.length === 1 ? data[0] : undefined;
  if (!page) {
    const names = data.map((p) => `${p.name} (${p.id})`).join(', ') || 'tidak ada';
    throw new Error(
      wanted
        ? `Page ${wanted} tidak ditemukan di akun ini. Page yang bisa diakses: ${names}. Saat membuat token, pastikan Page itu dicentang.`
        : `Akun ini mengelola beberapa Page (${names}); isi ID Page yang dipakai.`,
    );
  }
  if (page.tasks && !page.tasks.includes('CREATE_CONTENT')) throw new Error(`Akun ini tidak punya izin membuat konten di Page "${page.name}"`);
  const conn: FacebookConnection = { pageId: page.id, pageName: page.name, pageToken: page.access_token, connectedAt: new Date().toISOString() };
  ensureDir(paths.secrets());
  writeJsonAtomic(connectionFile(), conn);
  return conn;
}

/**
 * Uploaded to YouTube with a publish time still ahead, but not yet on the connected Facebook Page. Private
 * uploads (no publish time) are left out: they are not meant to be public yet.
 */
const FACEBOOK_FAILURE = 'Gagal mengirim ke Facebook';

/**
 * Why the last try to post this episode to Facebook failed, or undefined when it has not failed (never
 * tried, succeeded, or still to be tried after the failure).
 */
export function lastFacebookFailure(ep: Pick<Episode, 'facebook' | 'log'>): string | undefined {
  if (ep.facebook) return undefined;
  const last = [...ep.log].reverse().find((entry) => /facebook/i.test(entry.message));
  return last?.message.startsWith(FACEBOOK_FAILURE) ? last.message.slice(FACEBOOK_FAILURE.length).replace(/^[:\s]+/, '') : undefined;
}

export function needsFacebookPost(ep: Episode, now = Date.now()): boolean {
  if (!ep.youtube?.publishTime || ep.facebook || ep.status !== 'scheduled') return false;
  return new Date(ep.youtube.publishTime).getTime() > now + 15 * 60_000;
}
