'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BagianLipat } from '@/components/BagianLipat';
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
                  {p.name}
                </span>
                <span className="gelembung-pesan">{s?.message}</span>
              </button>
            );
          })}
        </div>
        <div className="kantor-petunjuk kecil">Geser untuk memutar · scroll untuk zoom · klik pegawai untuk detail</div>
      </div>

      <aside className="stack">
        <BagianLipat id="kantor-tim" judul="👥 Tim hari ini" ringkasan={`${bekerja} dari ${PEGAWAI.length} sedang bekerja`} bawaanBuka>
          <div>
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
                    {p.name[0]}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <b>{p.name}</b> <span className="muted kecil">· {p.role}</span>
                    <span className="kecil" style={{ display: 'block' }}>
                      <span className={`titik ${s?.keadaan}`} /> {s?.message}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </BagianLipat>

        {def && st ? (
          // muncul saat pegawai diklik, jadi langsung terbuka
          <BagianLipat
            key={def.id}
            id="kantor-detail"
            judul={
              <>
                {def.name} <span className="muted kecil">· {def.role}</span>
              </>
            }
            ringkasan={LABEL[st.keadaan]}
            bawaanBuka
            ingat={false}
          >
            <div>
              <span className={`titik ${st.keadaan}`} /> <b>{LABEL[st.keadaan]}</b> — {st.message}
            </div>
            {st.episodeId ? <Link href={`/episode/${st.episodeId}`}>Buka episode terkait →</Link> : null}
            <div>
              <h3>Aktivitas terakhir</h3>
              {st.aktivitas.length ? (
                <ul className="kecil" style={{ paddingLeft: 18, margin: 0 }}>
                  {st.aktivitas.map((a, i) => (
                    <li key={i}>
                      <span className="muted">{waktuRelatif(a.time)}</span> · {a.message}
                      {a.title ? <span className="muted"> ({a.title})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="kecil muted">Belum ada aktivitas.</div>
              )}
            </div>
          </BagianLipat>
        ) : null}

        <BagianLipat
          id="kantor-menunggu"
          judul="⏳ Menunggu kamu"
          ringkasan={data.menungguKamu.length ? `${data.menungguKamu.length} pekerjaan` : 'tidak ada'}
        >
          {data.menungguKamu.length ? (
            <ul className="kecil" style={{ paddingLeft: 18, margin: 0 }}>
              {data.menungguKamu.map((m) => (
                <li key={m.id}>
                  <Link href={`/episode/${m.id}`}>{m.title}</Link> <span className="muted">· {m.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="kecil muted">Tidak ada. Tim sedang aman.</div>
          )}
        </BagianLipat>
      </aside>
    </div>
  );
}
