// CLI kantor. Dipakai dashboard (di belakang layar) atau langsung dari terminal:
//   npm run kantor -- riset ["arahan opsional"]
//   npm run kantor -- tulis <id>
//   npm run kantor -- hafalan <id>      (ambil teks surat untuk video hafalan)
//   npm run kantor -- sutradara <id>
//   npm run kantor -- render <id>
//   npm run kantor -- upload <id> [2026-11-01T16:30:00+07:00]
//   npm run kantor -- shorts <id> [jumlah] ["arahan"]  (pecah video biasa jadi beberapa Shorts)
//   npm run kantor -- metadata <id> [render]  (buat ulang judul/deskripsi sesuai format, lalu render)
//   npm run kantor -- rencana ["arahan"]  (Channel Manager menyusun rencana jadwal tayang)
//   npm run kantor -- playlist [id]    (masukkan video ke playlist sesuai tipenya; tanpa id: semua yang belum)
//   npm run kantor -- tarik <id>        (jadikan private upload lama episode yang diedit ulang)
//   npm run kantor -- chat <agen>       (agen membalas pesan terakhir di kolom chat)
//   npm run kantor -- harian           (riset harian kalau sudah waktunya; dipanggil penjadwal)
//   npm run kantor -- harian-pasang    (pasang penjadwal macOS) | harian-lepas
//   npm run kantor -- laporan
//   npm run kantor -- status
import './env.ts';
import { AGEN_CHAT, listEpisodes, setStatus, STATUS_LABEL, tandaiSelesai, tandaiSibuk, tambahChat, type AgenChat } from '@kantor/shared';
import { balasChat } from './chat.ts';
import { lepasPenjadwal, pasangPenjadwal, risetHarianJikaPerlu } from './otomatis.ts';
import { pecahJadiShorts } from './shorts.ts';
import {
  buatUlangMetadata,
  laporan,
  masukkanPlaylist,
  render,
  riset,
  siapkanHafalan,
  susunRencanaTayang,
  sutradarai,
  tarikVideoLama,
  tulisNaskah,
  upload,
} from './workflow.ts';

const [cmd, arg1, arg2, arg3] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'riset':
      tandaiSibuk('riset');
      try {
        return void (await riset(arg1));
      } finally {
        tandaiSelesai('riset');
      }
    case 'harian':
      return risetHarianJikaPerlu();
    case 'harian-pasang':
      return pasangPenjadwal();
    case 'harian-lepas':
      return lepasPenjadwal();
    case 'tulis':
      return tulisNaskah(need(arg1));
    case 'hafalan':
      return siapkanHafalan(need(arg1));
    case 'sutradara':
      return sutradarai(need(arg1));
    case 'render':
      return render(need(arg1));
    case 'upload':
      return upload(need(arg1), arg2 ? new Date(arg2).toISOString() : undefined);
    case 'shorts': {
      const id = need(arg1);
      tandaiSibuk(`shorts-${id}`);
      try {
        return void (await pecahJadiShorts(id, Math.min(5, Math.max(1, Number(arg2) || 3)), arg3, render));
      } finally {
        tandaiSelesai(`shorts-${id}`);
      }
    }
    case 'metadata': {
      const id = need(arg1);
      tandaiSibuk(`${id}-metadata`);
      try {
        await buatUlangMetadata(id);
      } finally {
        tandaiSelesai(`${id}-metadata`);
      }
      return arg2 === 'render' ? render(id) : undefined;
    }
    case 'rencana':
      tandaiSibuk('rencana');
      try {
        return await susunRencanaTayang(arg1);
      } finally {
        tandaiSelesai('rencana');
      }
    case 'playlist':
      tandaiSibuk('playlist');
      try {
        return await masukkanPlaylist(arg1);
      } finally {
        tandaiSelesai('playlist');
      }
    case 'tarik':
      return tarikVideoLama(need(arg1));
    case 'chat': {
      const agen = need(arg1) as AgenChat;
      if (!AGEN_CHAT.includes(agen)) throw new Error(`Agen tidak dikenal: ${agen}`);
      tandaiSibuk(`chat-${agen}`);
      try {
        return await balasChat(agen);
      } catch (e) {
        tambahChat(agen, { dari: 'agen', teks: `Maaf, ada masalah: ${(e as Error).message}` });
        throw e;
      } finally {
        tandaiSelesai(`chat-${agen}`);
      }
    }
    case 'laporan':
      tandaiSibuk('laporan');
      try {
        return void (await laporan());
      } finally {
        tandaiSelesai('laporan');
      }
    case 'status':
      for (const e of listEpisodes()) {
        console.log(`${e.id.padEnd(48)} ${STATUS_LABEL[e.status]}  — ${e.naskah?.judul ?? e.ide.judul}`);
      }
      return;
    default:
      console.log('Perintah: riset | harian | harian-pasang | harian-lepas | chat <agen> | tulis <id> | hafalan <id> | sutradara <id> | render <id> | upload <id> [jadwal] | shorts <id> [jumlah] | metadata <id> [render] | rencana [arahan] | playlist [id] | tarik <id> | laporan | status');
  }
}

function need(id?: string): string {
  if (!id) throw new Error('ID episode wajib diisi');
  return id;
}

main().catch((e: unknown) => {
  const pesan = e instanceof Error ? e.message : String(e);
  console.error(`❌ ${pesan}`);
  const butuhId = ['tulis', 'hafalan', 'sutradara', 'render', 'upload'].includes(cmd ?? '');
  if (butuhId && arg1) {
    try {
      setStatus(arg1, 'error', cmd!, pesan);
    } catch {
      /* episode mungkin tidak ada */
    }
  }
  process.exit(1);
});
