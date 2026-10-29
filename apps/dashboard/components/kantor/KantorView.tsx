'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { RefGelembung } from './Scene';
import { PEGAWAI, type DataKantor, type PegawaiId } from './pegawai';

// three.js hanya jalan di browser
const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => <div className="kantor-memuat">Menyiapkan kantor…</div>,
});

const LABEL = { kerja: 'Sedang bekerja', tunggu: 'Menunggu kamu', santai: 'Istirahat' } as const;

function waktuRelatif(iso: string) {
  const detik = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} mnt lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export function KantorView({ awal }: { awal: DataKantor }) {
  const [data, setData] = useState(awal);
  const [terpilih, setTerpilih] = useState<PegawaiId | null>(null);
  const gelembung: RefGelembung = useRef({});

  useEffect(() => {
    let aktif = true;
    const ambil = async () => {
      try {
        const res = await fetch('/api/kantor', { cache: 'no-store' });
        if (res.ok && aktif) setData(await res.json());
      } catch {
        /* coba lagi di putaran berikutnya */
      }
    };
    const t = setInterval(ambil, 3000);
    return () => {
      aktif = false;
      clearInterval(t);
    };
  }, []);

  const bekerja = data.pegawai.filter((p) => p.keadaan === 'kerja').length;
  const def = PEGAWAI.find((p) => p.id === terpilih);
  const st = data.pegawai.find((p) => p.id === terpilih);

  return (
    <div className="kantor">
      <div className="kantor-kanvas">
        <Scene data={data} terpilih={terpilih} onPilih={setTerpilih} gelembung={gelembung} />
        <div className="lapisan-gelembung">
          {PEGAWAI.map((p) => {
            const s = data.pegawai.find((x) => x.id === p.id);
            const keadaan = s?.keadaan ?? 'santai';
            const pilih = terpilih === p.id;
            return (
              <button
                key={p.id}
                type="button"
                ref={(el) => {
                  gelembung.current[p.id] = el as HTMLDivElement | null;
                }}
                className={`gelembung ${pilih ? 'terpilih' : ''} ${keadaan === 'santai' && !pilih ? 'ringkas' : ''}`}
                onClick={() => setTerpilih(pilih ? null : p.id)}
              >
                <span className="gelembung-nama">
                  <span className={`titik ${keadaan}`} />
                  {p.nama}
                </span>
                <span className="gelembung-pesan">{s?.pesan}</span>
              </button>
            );
          })}
        </div>
        <div className="kantor-petunjuk kecil">Geser untuk memutar · scroll untuk zoom · klik pegawai untuk detail</div>
      </div>

      <aside className="stack">
        <div className="panel">
          <h2>Tim hari ini</h2>
          <div className="kecil muted" style={{ marginBottom: 10 }}>
            {bekerja} dari {PEGAWAI.length} sedang bekerja
          </div>
          {PEGAWAI.map((p) => {
            const s = data.pegawai.find((x) => x.id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`baris-pegawai ${terpilih === p.id ? 'aktif' : ''}`}
                onClick={() => setTerpilih(terpilih === p.id ? null : p.id)}
              >
                <span className="avatar" style={{ background: p.warnaBaju }}>
                  {p.nama[0]}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <b>{p.nama}</b> <span className="muted kecil">· {p.peran}</span>
                  <span className="kecil" style={{ display: 'block' }}>
                    <span className={`titik ${s?.keadaan}`} /> {s?.pesan}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {def && st ? (
          <div className="panel stack">
            <h2>
              {def.nama} <span className="muted kecil">· {def.peran}</span>
            </h2>
            <div>
              <span className={`titik ${st.keadaan}`} /> <b>{LABEL[st.keadaan]}</b> — {st.pesan}
            </div>
            {st.episodeId ? <Link href={`/episode/${st.episodeId}`}>Buka episode terkait →</Link> : null}
            <div>
              <h3>Aktivitas terakhir</h3>
              {st.aktivitas.length ? (
                <ul className="kecil" style={{ paddingLeft: 18, margin: 0 }}>
                  {st.aktivitas.map((a, i) => (
                    <li key={i}>
                      <span className="muted">{waktuRelatif(a.waktu)}</span> · {a.pesan}
                      {a.judul ? <span className="muted"> ({a.judul})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="kecil muted">Belum ada aktivitas.</div>
              )}
            </div>
          </div>
        ) : null}

        <div className="panel">
          <h2>Menunggu kamu</h2>
          {data.menungguKamu.length ? (
            <ul className="kecil" style={{ paddingLeft: 18, margin: 0 }}>
              {data.menungguKamu.map((m) => (
                <li key={m.id}>
                  <Link href={`/episode/${m.id}`}>{m.judul}</Link> <span className="muted">· {m.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="kecil muted">Tidak ada. Tim sedang aman.</div>
          )}
        </div>
      </aside>
    </div>
  );
}
