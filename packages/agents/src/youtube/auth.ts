// Hubungkan channel YouTube kamu (cukup sekali).
// Jalankan: npm run auth:youtube
import fs from 'node:fs';
import http from 'node:http';
import '../env.ts';
import { ensureDir, paths } from '@kantor/shared';
import { oauthClient, REDIRECT_PORT, SCOPES, tokenFile } from './client.ts';

const client = oauthClient();
const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/oauth2callback')) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, `http://localhost:${REDIRECT_PORT}`).searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Kode tidak ditemukan');
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    ensureDir(paths.secrets());
    fs.writeFileSync(tokenFile(), JSON.stringify(tokens, null, 2));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Channel terhubung ✅</h2><p>Kamu boleh menutup tab ini.</p>');
    console.log(`\n✅ Token tersimpan di ${tokenFile()}`);
  } catch (e) {
    res.writeHead(500).end(String(e));
    console.error(e);
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

server.listen(REDIRECT_PORT, () => {
  console.log('Buka URL ini di browser, login dengan akun Google pemilik channel:\n');
  console.log(url, '\n');
});
