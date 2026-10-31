'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CHAT_AGENTS } from '@kantor/shared/constants';
import type { ChatAgent, ChatMessage } from '@kantor/shared/types';
import { STAFF } from '@/components/office/staff';

type Pesan = ChatMessage & { episodeTitle?: string };
interface Ringkasan {
  agen: ChatAgent;
  terakhir: ChatMessage | null;
  mengetik: boolean;
}

const SUGGESTIONS: Record<ChatAgent, string[]> = {
  manajer: ['Apa yang harus aku kerjakan duluan hari ini?', 'Jelaskan beda video cerita, hafalan, dan Shorts'],
  riset: ['Topik apa yang lagi banyak dicari orang tua minggu ini?', 'Ide Shorts yang cocok untuk usia 1-3?'],
  penulis: ['Bagaimana cara bikin pembuka cerita yang menarik?', 'Kasih contoh lelucon Mochi yang lucu'],
  reviewer: ['Apa saja yang sering bikin naskah ditolak?', 'Hadits tentang makan dengan tangan kanan, sumbernya apa?'],
  sutradara: ['Latar apa yang cocok untuk cerita tentang hujan?', 'Kapan sebaiknya pakai ekspresi kaget?'],
  channel: ['Bagaimana performa channel kita?', 'Jam tayang terbaik untuk penonton anak?'],
};

const pegawai = (id: ChatAgent) => STAFF.find((p) => p.id === id)!;

const Avatar = ({ id, besar }: { id: ChatAgent; besar?: boolean }) => (
  <span className={`chat-avatar ${besar ? 'besar' : ''}`} style={{ background: pegawai(id).warnaBaju }}>
    {pegawai(id).name[0]}
  </span>
);

/** Event untuk membuka chat dari tombol lain, misal di halaman episode. */
export const openChat = (agen: ChatAgent = 'manajer') => window.dispatchEvent(new CustomEvent('buka-chat', { detail: agen }));

/**
 * Chat mengambang di pojok kanan bawah (ala LinkedIn): bilah daftar agen yang bisa
 * dibuka-tutup, dan jendela obrolan di sebelah kirinya.
 */
export function FloatingChat() {
  const pathname = usePathname();
  const episodeHalaman = pathname.match(/^\/episode\/([^/]+)/)?.[1];

  const [daftarTerbuka, setDaftarTerbuka] = useState(false);
  const [agen, setAgen] = useState<ChatAgent | null>(null);
  const [kecil, setKecil] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [mengetik, setMengetik] = useState(false);
  const [teks, setTeks] = useState('');
  const [bahasEpisode, setBahasEpisode] = useState(true);
  const [ringkasan, setRingkasan] = useState<Ringkasan[]>([]);
  const isiRef = useRef<HTMLDivElement>(null);

  const muatRingkasan = useCallback(async () => {
    const r = await fetch('/api/chat').then((x) => x.json());
    setRingkasan(r.summary ?? []);
  }, []);

  const muatPesan = useCallback(async (a: ChatAgent) => {
    const r = await fetch(`/api/chat?agen=${a}`).then((x) => x.json());
    setPesan(r.message ?? []);
    setMengetik(Boolean(r.mengetik));
  }, []);

  // buka dari tombol lain
  useEffect(() => {
    const buka = (e: Event) => {
      setAgen((e as CustomEvent<ChatAgent>).detail);
      setKecil(false);
      setBahasEpisode(true);
    };
    window.addEventListener('buka-chat', buka);
    return () => window.removeEventListener('buka-chat', buka);
  }, []);

  useEffect(() => {
    if (daftarTerbuka) void muatRingkasan();
  }, [daftarTerbuka, muatRingkasan]);

  useEffect(() => {
    if (agen) void muatPesan(agen);
  }, [agen, muatPesan]);

  // tanya ulang tiap 2,5 detik selama agen sedang mengetik
  useEffect(() => {
    if (!agen || !mengetik) return;
    const t = setInterval(() => void muatPesan(agen), 2500);
    return () => clearInterval(t);
  }, [agen, mengetik, muatPesan]);

  useEffect(() => {
    isiRef.current?.scrollTo({ top: isiRef.current.scrollHeight, behavior: 'smooth' });
  }, [pesan, mengetik, kecil]);

  async function kirim(isi: string) {
    if (!agen || !isi.trim() || mengetik) return;
    setTeks('');
    setMengetik(true);
    setPesan((p) => [...p, { time: new Date().toISOString(), from: 'owner', text: isi.trim() }]);
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agen, teks: isi, episodeId: bahasEpisode ? episodeHalaman : undefined }),
    }).then((x) => x.json());
    if (r.message) setPesan(r.message);
  }

  async function obrolanBaru() {
    if (!agen) return;
    await fetch(`/api/chat?agen=${agen}`, { method: 'DELETE' });
    setPesan([]);
    setMengetik(false);
  }

  const sibuk = ringkasan.filter((r) => r.mengetik).length;

  return (
    <div className="chat-mengambang">
      {agen ? (
        <div className={`chat-jendela ${kecil ? 'kecil' : ''}`}>
          <div className="chat-kepala" onClick={() => setKecil((k) => !k)}>
            <Avatar id={agen} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{pegawai(agen).name}</b>
              <div className="kecil muted">{mengetik ? 'sedang mengetik…' : pegawai(agen).role}</div>
            </div>
            <button
              type="button"
              className="chat-ikon"
              title="Obrolan baru"
              onClick={(e) => {
                e.stopPropagation();
                void obrolanBaru();
              }}
            >
              🧹
            </button>
            <button type="button" className="chat-ikon" title={kecil ? 'Buka' : 'Kecilkan'}>
              {kecil ? '▴' : '▾'}
            </button>
            <button
              type="button"
              className="chat-ikon"
              title="Tutup"
              onClick={(e) => {
                e.stopPropagation();
                setAgen(null);
              }}
            >
              ✕
            </button>
          </div>
          {kecil ? null : (
            <>
              <div className="chat-isi" ref={isiRef}>
                {pesan.length === 0 ? (
                  <div className="stack">
                    <p className="muted kecil" style={{ margin: 0 }}>
                      Tanya apa saja ke {pegawai(agen).name}. Agen hanya menjawab, tidak mengubah naskah atau data.
                    </p>
                    {SUGGESTIONS[agen].map((s) => (
                      <button key={s} type="button" className="sekunder kecil chat-saran" onClick={() => void kirim(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
                {pesan.map((p, i) => (
                  <div key={i} className={`chat-pesan ${p.from === 'owner' ? 'saya' : 'agen'}`}>
                    {p.episodeId && (i === 0 || pesan[i - 1].episodeId !== p.episodeId) ? (
                      <div className="kecil muted">📎 {p.episodeTitle ?? 'episode'}</div>
                    ) : null}
                    <div className="chat-pesan-teks">{p.text}</div>
                  </div>
                ))}
                {mengetik ? <div className="chat-pesan agen mengetik">mengetik…</div> : null}
              </div>
              <form
                className="chat-tulis"
                onSubmit={(e) => {
                  e.preventDefault();
                  void kirim(teks);
                }}
              >
                {episodeHalaman ? (
                  <label className="kecil row" style={{ gap: 6 }}>
                    <input type="checkbox" checked={bahasEpisode} onChange={(e) => setBahasEpisode(e.target.checked)} />
                    Bahas episode yang sedang dibuka
                  </label>
                ) : null}
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <textarea
                    value={teks}
                    rows={2}
                    placeholder={`Tulis pesan…`}
                    onChange={(e) => setTeks(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter = kirim, Shift+Enter = baris baru
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void kirim(teks);
                      }
                    }}
                  />
                  <button type="submit" disabled={mengetik || !teks.trim()}>
                    ➤
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      ) : null}

      <div className={`chat-daftar-mengambang ${daftarTerbuka ? 'terbuka' : ''}`}>
        <div className="chat-kepala" onClick={() => setDaftarTerbuka((t) => !t)}>
          <span className="chat-avatar" style={{ background: '#2f6f5e' }}>
            💬
          </span>
          <b style={{ flex: 1 }}>Chat dengan agen</b>
          {sibuk ? <span className="badge">{sibuk} mengetik</span> : null}
          <button type="button" className="chat-ikon">
            {daftarTerbuka ? '▾' : '▴'}
          </button>
        </div>
        {daftarTerbuka ? (
          <div className="chat-daftar-isi">
            {CHAT_AGENTS.map((id) => {
              const r = ringkasan.find((x) => x.agen === id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`chat-agen ${agen === id ? 'aktif' : ''}`}
                  onClick={() => {
                    setAgen(id);
                    setKecil(false);
                  }}
                >
                  <Avatar id={id} />
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <b>{pegawai(id).name}</b> <span className="kecil muted">· {pegawai(id).role}</span>
                    <span className="kecil muted chat-cuplikan">
                      {r?.mengetik ? 'sedang mengetik…' : r?.terakhir ? `${r.terakhir.from === 'owner' ? 'Kamu: ' : ''}${r.terakhir.text}` : 'Mulai obrolan'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
