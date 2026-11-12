'use client';

import { useMemo, useState } from 'react';

export interface PilihanVideo {
  id: string;
  title: string;
  /** Kelompok tampilan (playlist), misal "Hafalan" */
  group: string;
  /** Lama video (detik); 0 = tidak diketahui */
  seconds: number;
  status: string;
}

const menit = (detik: number) => {
  const m = Math.floor(detik / 60);
  const s = Math.round(detik % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Pilih video untuk kompilasi: centang di daftar, atur urutan di panel "Urutan" (naik/turun), dan lihat
 * total durasinya langsung. Urutan dikirim sebagai input `video` berurutan.
 */
export function CompilationPicker({ videos }: { videos: PilihanVideo[] }) {
  const [urutan, setUrutan] = useState<string[]>([]);
  const [saring, setSaring] = useState('');
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const groups = useMemo(() => [...new Set(videos.map((v) => v.group))], [videos]);
  const total = urutan.reduce((s, id) => s + (byId.get(id)?.seconds ?? 0), 0);

  const toggle = (id: string) => setUrutan((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  const pindah = (i: number, arah: -1 | 1) =>
    setUrutan((u) => {
      const j = i + arah;
      if (j < 0 || j >= u.length) return u;
      const baru = u.slice();
      [baru[i], baru[j]] = [baru[j], baru[i]];
      return baru;
    });
  const pilihSemua = (group: string) =>
    setUrutan((u) => [...u, ...videos.filter((v) => v.group === group && !u.includes(v.id)).map((v) => v.id)]);

  const cocok = (v: PilihanVideo) => !saring || v.title.toLowerCase().includes(saring.toLowerCase());

  return (
    <div className="kompilasi-pilih">
      <div className="stack" style={{ gap: 10 }}>
        <input type="search" placeholder="Cari judul video…" value={saring} onChange={(e) => setSaring(e.target.value)} />
        {groups.map((g) => {
          const isi = videos.filter((v) => v.group === g && cocok(v));
          if (!isi.length) return null;
          return (
            <div key={g} className="stack" style={{ gap: 4 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b className="kecil">📂 {g}</b>
                <button type="button" className="sekunder kecil" onClick={() => pilihSemua(g)}>
                  Pilih semua
                </button>
              </div>
              {isi.map((v) => (
                <label key={v.id} className="kompilasi-video kecil">
                  <input type="checkbox" checked={urutan.includes(v.id)} onChange={() => toggle(v.id)} />
                  <span className="kompilasi-judul">{v.title}</span>
                  <span className="muted">{v.seconds ? menit(v.seconds) : '?'}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>

      <div className="panel stack kompilasi-urutan" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>Urutan ({urutan.length} video)</b>
          <b className={total >= 20 * 60 && total <= 60 * 60 ? '' : 'muted'}>{menit(total)}</b>
        </div>
        <span className="kecil muted">
          {total < 20 * 60 ? `Target kompilasi 20–60 menit; kurang ±${Math.ceil((20 * 60 - total) / 60)} menit lagi.` : total > 60 * 60 ? 'Lebih dari 60 menit; boleh, tapi pertimbangkan dipecah.' : 'Durasi sudah pas (20–60 menit).'}
        </span>
        {urutan.length === 0 ? <span className="kecil muted">Centang video di sebelah kiri.</span> : null}
        <ol className="kecil" style={{ margin: 0, paddingLeft: 20 }}>
          {urutan.map((id, i) => (
            <li key={id} style={{ marginBottom: 4 }}>
              <input type="hidden" name="video" value={id} />
              <div className="row" style={{ gap: 6, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <span>{byId.get(id)?.title}</span>
                <span className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                  <button type="button" className="sekunder" onClick={() => pindah(i, -1)} disabled={i === 0} aria-label="Naikkan">
                    ↑
                  </button>
                  <button type="button" className="sekunder" onClick={() => pindah(i, 1)} disabled={i === urutan.length - 1} aria-label="Turunkan">
                    ↓
                  </button>
                  <button type="button" className="sekunder" onClick={() => toggle(id)} aria-label="Keluarkan">
                    ✕
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
