import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { paths } from '@kantor/shared';

export const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

export const REDIRECT_PORT = 5555;
export const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

export const tokenFile = () => path.join(paths.secrets(), 'youtube-token.json');

export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum diisi di .env');
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

/** Client yang sudah login ke channel kamu, atau undefined kalau belum `npm run auth:youtube`. */
export function authedClient() {
  if (!fs.existsSync(tokenFile())) return undefined;
  const client = oauthClient();
  client.setCredentials(JSON.parse(fs.readFileSync(tokenFile(), 'utf8')));
  client.on('tokens', (t) => {
    // simpan refresh token baru bila Google mengirimkannya
    const lama = JSON.parse(fs.readFileSync(tokenFile(), 'utf8'));
    fs.writeFileSync(tokenFile(), JSON.stringify({ ...lama, ...t }, null, 2));
  });
  return client;
}

/** YouTube Data API untuk membaca data publik (riset). */
export function youtubeRead() {
  const auth = authedClient();
  if (auth) return google.youtube({ version: 'v3', auth });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY belum diisi di .env');
  return google.youtube({ version: 'v3', auth: key });
}

export function youtubeWrite() {
  const auth = authedClient();
  if (!auth) throw new Error('Channel belum terhubung. Jalankan: npm run auth:youtube');
  return google.youtube({ version: 'v3', auth });
}

export function analytics() {
  const auth = authedClient();
  if (!auth) return undefined;
  return google.youtubeAnalytics({ version: 'v2', auth });
}
