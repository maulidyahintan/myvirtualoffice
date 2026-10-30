import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { AksiTokoh, Karakter, Properti as PropertiId } from '@kantor/shared/types';
import { diMeja, MejaMakanan, PropertiLantai } from './Benda';

// Menata properti adegan di lantai panggung (koordinat 1920x1080): makanan dikumpulkan di satu
// meja kecil, sajadah di bawah tokoh, sisanya mengisi ruang kosong di samping tokoh.

type Letak = { x: number; isi: React.ReactNode; lebar: number };

/** Ruang kosong di lantai yang tidak bertabrakan dengan tokoh. */
function cariTempat(lebar: number, xs: number[], terpakai: Letak[], vertikal: boolean): number | undefined {
  const kandidat = vertikal ? [700, 1220, 960, 600, 1320] : [330, 1590, 960, 620, 1300, 160, 1760];
  return kandidat.find(
    (x) =>
      xs.every((t) => Math.abs(t - x) > lebar / 2 + (vertikal ? 70 : 120)) &&
      terpakai.every((p) => Math.abs(p.x - x) > (p.lebar + lebar) / 2 + 20),
  );
}

export const PropertiAdegan: React.FC<{
  properti: PropertiId[];
  aksi: AksiTokoh[];
  urut: Karakter[];
  xs: number[];
  lantai: number;
  /** skala properti agar sebanding dengan tinggi tokoh */
  skala: number;
  vertikal: boolean;
  /** 'bawah' = lapisan lantai di bawah tokoh (sajadah, bantal), 'belakang' = sisanya */
  lapisan: 'bawah' | 'belakang';
}> = ({ properti, aksi, urut, xs, lantai, skala, vertikal, lapisan }) => {
  const frame = useCurrentFrame();
  const unik = [...new Set(properti)].slice(0, 3);
  const isi: React.ReactNode[] = [];

  if (lapisan === 'bawah') {
    if (unik.includes('sajadah')) {
      // di bawah tokoh yang berdoa/membaca, atau di tengah rombongan
      const iTokoh = urut.findIndex((id) => aksi.some((a) => a.karakter === id && (a.aksi === 'berdoa' || a.aksi === 'membaca-quran')));
      const x = iTokoh >= 0 ? xs[iTokoh] : xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 960;
      isi.push(
        <g key="sajadah" transform={`translate(${x} ${lantai + 24 * skala}) scale(${skala})`}>
          <PropertiLantai id="sajadah" frame={frame} />
        </g>,
      );
    }
    // Mochi yang tidur berbaring di bantal
    const iMochi = urut.indexOf('mochi');
    if (iMochi >= 0 && aksi.some((a) => a.karakter === 'mochi' && a.aksi === 'tidur')) {
      isi.push(
        <g key="bantal" transform={`translate(${xs[iMochi]} ${lantai + 10}) scale(${skala * 0.9})`}>
          <PropertiLantai id="bantal" frame={frame} />
        </g>,
      );
    }
  } else {
    const terpakai: Letak[] = [];
    const makanan = unik.filter(diMeja);
    if (makanan.length) {
      const lebar = Math.max(170, makanan.length * 100 + 40) * skala;
      const x = cariTempat(lebar, xs, terpakai, vertikal);
      if (x !== undefined) {
        terpakai.push({
          x,
          lebar,
          isi: (
            <g key="meja" transform={`translate(${x} ${lantai}) scale(${skala})`}>
              <MejaMakanan isi={makanan} />
            </g>
          ),
        });
      }
    }
    for (const p of unik.filter((p) => !diMeja(p) && p !== 'sajadah' && p !== 'bantal')) {
      const lebar = (p === 'pohon-pot' ? 200 : p === 'kotak-mainan' ? 150 : p === 'rehal-quran' ? 140 : 110) * skala;
      const x = cariTempat(lebar, xs, terpakai, vertikal);
      if (x === undefined) continue;
      terpakai.push({
        x,
        lebar,
        isi: (
          <g key={p} transform={`translate(${x} ${lantai}) scale(${skala})`}>
            <PropertiLantai id={p} frame={frame} />
          </g>
        ),
      });
    }
    isi.push(...terpakai.map((t) => t.isi));
  }

  if (!isi.length) return null;
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'visible' }}>
      {isi}
    </svg>
  );
};
