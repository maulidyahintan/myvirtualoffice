import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Expression } from '@kantor/shared/types';
import { kelopak, mulutBicara, noiseS } from '../characters/gerak';

// PROTOTIPE: Mamas versi 3D dari bentuk dasar three.js, mengikuti desain 2D
// (kepala chibi besar, peci rajut biru, koko putih berkerah abu-abu, panel motif, celana abu, sepatu putih).
// Gaya kartun: toon shading 3 tingkat + garis tepi (inverted hull). Semua gerak bergantung frame saja.

const K = {
  kulit: '#F6CBAE',
  kulitBayang: '#E9A687',
  pipi: '#F29C9C',
  rambut: '#4A3830',
  peci: '#3E6E9E',
  peciGelap: '#2E5680',
  baju: '#FFFFFF',
  kerah: '#9AA0A8',
  panel: '#DDE3EA',
  panelMotif: '#9FB0C4',
  pita: '#E8C66A',
  kancing: '#C8A27C',
  celana: '#4C566B',
  sepatu: '#FFFFFF',
  mata: '#3A2418',
  garis: '#3B2F2F',
};

/** Tekstur gradasi 3 tingkat untuk toon shading. */
function useGradasiToon() {
  return useMemo(() => {
    const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
}

/** Tekstur pola dari canvas 2D (rajut peci, motif panel koko). */
function usePola(gambar: (c: CanvasRenderingContext2D) => void, ulangX: number, ulangY: number) {
  return useMemo(() => {
    const kanvas = document.createElement('canvas');
    kanvas.width = 64;
    kanvas.height = 64;
    gambar(kanvas.getContext('2d')!);
    const t = new THREE.CanvasTexture(kanvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(ulangX, ulangY);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

type Vec3 = [number, number, number];

/** Satu bagian tubuh: mesh toon + garis tepi (salinan sisi belakang yang sedikit lebih besar). */
const Bagian: React.FC<{
  children: React.ReactElement; // geometry
  warna?: string;
  peta?: THREE.Texture;
  gradasi: THREE.Texture;
  posisi?: Vec3;
  rotasi?: Vec3;
  skala?: Vec3;
  garis?: number;
}> = ({ children, warna = '#fff', peta, gradasi, posisi, rotasi, skala, garis = 0.025 }) => (
  <group position={posisi} rotation={rotasi} scale={skala}>
    <mesh>
      {children}
      <meshToonMaterial color={peta ? '#fff' : warna} map={peta} gradientMap={gradasi} />
    </mesh>
    {garis > 0 ? (
      <mesh scale={1 + garis}>
        {children}
        <meshBasicMaterial color={K.garis} side={THREE.BackSide} />
      </mesh>
    ) : null}
  </group>
);

/** Fitur wajah datar (mata, pipi, mulut): tanpa garis tepi & tanpa bayangan toon. */
const Datar: React.FC<{ warna: string; posisi: Vec3; skala: Vec3; rotasi?: Vec3; opasitas?: number }> = ({ warna, posisi, skala, rotasi, opasitas = 1 }) => (
  <mesh position={posisi} scale={skala} rotation={rotasi}>
    <sphereGeometry args={[1, 24, 16]} />
    <meshBasicMaterial color={warna} transparent={opasitas < 1} opacity={opasitas} />
  </mesh>
);

/** Titik di permukaan kepala (bola jari-jari R di pusat), menghadap ke depan. */
const R = 0.5;
const diKepala = (x: number, y: number, maju = 0): Vec3 => [x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) + maju];

export const Mamas3D: React.FC<{
  frame: number;
  expression: Expression;
  bicara: boolean;
  lambai: boolean;
  /** -1..1 arah pandang */
  lihatX?: number;
}> = ({ frame: f, expression, bicara, lambai, lihatX = 0 }) => {
  const g = useGradasiToon();
  const rajut = usePola(
    (c) => {
      c.fillStyle = K.peci;
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = K.peciGelap;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(0, 44);
      c.lineTo(16, 20);
      c.lineTo(32, 44);
      c.lineTo(48, 20);
      c.lineTo(64, 44);
      c.stroke();
    },
    10,
    3,
  );
  const motif = usePola(
    (c) => {
      c.fillStyle = K.panel;
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = K.panelMotif;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(32, 6);
      c.lineTo(58, 32);
      c.lineTo(32, 58);
      c.lineTo(6, 32);
      c.closePath();
      c.stroke();
    },
    10,
    1,
  );

  // --- gerak tubuh
  const napas = Math.sin(f / 24);
  const senang = expression === 'happy';
  let lompat = 0;
  if (senang && !bicara) {
    const p = (f % 50) / 50;
    if (p < 0.4) lompat = Math.sin((p / 0.4) * Math.PI) * 0.12;
  }
  const miring = bicara ? noiseS(f / 30, 7) * 0.12 : Math.sin(f / 70) * 0.06;
  const angguk = bicara ? Math.max(0, Math.sin(f / 9)) * 0.05 : 0;
  const tolehY = lihatX * 0.35 + (expression === 'thinking' ? 0.15 : 0);

  // --- wajah
  const tutup = kelopak(f, 1);
  const mataTinggi = Math.max(0.08, 1 - tutup) * (expression === 'surprised' ? 1.12 : 1);
  const mulut = bicara ? mulutBicara(f, 1) : { buka: expression === 'surprised' ? 0.7 : 0, bulat: expression === 'surprised' ? 1 : 0 };
  const mataSenyum = senang && !bicara;

  // --- lengan: pivot di bahu. z = ayun depan/belakang, x = buka ke samping
  const ayun = Math.sin(f / 30) * 0.06;
  let kananBuka = 0.18 + ayun;
  let kananSiku = 0;
  if (lambai) {
    kananBuka = 2.5;
    kananSiku = Math.sin(f / 5) * 0.45;
  } else if (bicara) {
    kananBuka = 0.45 + Math.max(0, noiseS(f / 14, 3)) * 0.5;
    kananSiku = -0.4;
  }
  const kiriBuka = expression === 'thinking' ? 0.5 : 0.18 - ayun;

  const mata = (sisi: 1 | -1) => {
    const x = 0.17 * sisi;
    const y = -0.02;
    const pos = diKepala(x, y, -0.04);
    const geser = lihatX * 0.025;
    return (
      <group key={sisi} position={pos} rotation={[0, x * 1.1, 0]}>
        {mataSenyum ? (
          // mata tersenyum ^^
          <mesh rotation={[0, 0, 0]} position={[0, 0.02, 0.03]}>
            <torusGeometry args={[0.07, 0.016, 8, 24, Math.PI]} />
            <meshBasicMaterial color={K.mata} />
          </mesh>
        ) : (
          <group scale={[1, mataTinggi, 1]}>
            <Datar warna="#FFFFFF" posisi={[0, 0, 0]} skala={[0.095, 0.11, 0.04]} />
            <Datar warna={K.mata} posisi={[geser, -0.005, 0.02]} skala={[0.08, 0.095, 0.035]} />
            <Datar warna="#120A06" posisi={[geser, -0.01, 0.04]} skala={[0.04, 0.05, 0.02]} />
            {/* kilau besar & kecil */}
            <Datar warna="#FFFFFF" posisi={[geser - 0.03, 0.035, 0.055]} skala={[0.026, 0.03, 0.01]} />
            <Datar warna="#FFFFFF" posisi={[geser + 0.03, -0.04, 0.055]} skala={[0.012, 0.013, 0.01]} />
          </group>
        )}
        {/* alis */}
        <mesh position={[0, 0.15 + (expression === 'surprised' ? 0.03 : 0), 0.035]} rotation={[0, 0, (expression === 'sad' ? -0.25 : 0.08) * sisi]}>
          <capsuleGeometry args={[0.012, 0.07, 4, 8]} />
          <meshBasicMaterial color={K.rambut} />
        </mesh>
      </group>
    );
  };

  return (
    <group position={[0, lompat, 0]}>
      {/* bayangan kontak */}
      <mesh position={[0, 0.005 - lompat, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={1 - lompat * 2}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      {/* sepatu & kaki */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bagian gradasi={g} warna={K.sepatu} posisi={[0.13 * s, 0.06, 0.04]} skala={[1, 0.7, 1.3]}>
            <sphereGeometry args={[0.1, 20, 14]} />
          </Bagian>
          <Bagian gradasi={g} warna={K.celana} posisi={[0.13 * s, 0.25, 0]}>
            <capsuleGeometry args={[0.075, 0.22, 6, 12]} />
          </Bagian>
        </group>
      ))}

      {/* badan (napas) */}
      <group position={[0, 0.38, 0]} scale={[1 - napas * 0.006, 1 + napas * 0.01, 1]}>
        {/* koko: tabung melebar ke bawah */}
        <Bagian gradasi={g} warna={K.baju} posisi={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.24, 0.31, 0.6, 28]} />
        </Bagian>
        {/* panel motif & pita emas di bagian bawah koko */}
        <Bagian gradasi={g} peta={motif} posisi={[0, 0.1, 0]} garis={0}>
          <cylinderGeometry args={[0.3, 0.315, 0.2, 28, 1, true]} />
        </Bagian>
        <Bagian gradasi={g} warna={K.pita} posisi={[0, 0.21, 0]} garis={0}>
          <cylinderGeometry args={[0.296, 0.3, 0.035, 28, 1, true]} />
        </Bagian>
        {/* kancing */}
        {[0.5, 0.38, 0.26].map((y) => (
          <Bagian key={y} gradasi={g} warna={K.kancing} posisi={[0, y, 0.26 + (0.5 - y) * 0.1]} garis={0}>
            <sphereGeometry args={[0.022, 10, 8]} />
          </Bagian>
        ))}
        {/* kerah shanghai */}
        {[-1, 1].map((s) => (
          <Bagian key={s} gradasi={g} warna={K.kerah} posisi={[0.07 * s, 0.6, 0.15]} rotasi={[0.2, 0.5 * s, 0]}>
            <boxGeometry args={[0.12, 0.07, 0.04]} />
          </Bagian>
        ))}

        {/* lengan: [sisi, buka, siku] */}
        {(
          [
            [-1, kiriBuka, expression === 'thinking' ? -1.9 : 0],
            [1, kananBuka, kananSiku],
          ] as const
        ).map(([s, buka, siku]) => (
          <group key={s} position={[0.27 * s, 0.54, 0]} rotation={[expression === 'thinking' && s < 0 ? -0.6 : 0, 0, buka * s]}>
            <Bagian gradasi={g} warna={K.baju} posisi={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.07, 0.14, 6, 12]} />
            </Bagian>
            <group position={[0, -0.24, 0]} rotation={[0, 0, siku * s]}>
              <Bagian gradasi={g} warna={K.baju} posisi={[0, -0.08, 0]}>
                <capsuleGeometry args={[0.062, 0.1, 6, 12]} />
              </Bagian>
              <Bagian gradasi={g} warna={K.kulit} posisi={[0, -0.2, 0]}>
                <sphereGeometry args={[0.07, 16, 12]} />
              </Bagian>
            </group>
          </group>
        ))}
      </group>

      {/* kepala */}
      <group position={[0, 0.98, 0]} rotation={[angguk, tolehY, miring]}>
        <Bagian gradasi={g} warna={K.kulitBayang} posisi={[0, 0.04, 0]} garis={0}>
          <cylinderGeometry args={[0.08, 0.09, 0.1, 14]} />
        </Bagian>
        <group position={[0, 0.5, 0]} scale={[1.06, 0.96, 1]}>
          {/* wajah */}
          <Bagian gradasi={g} warna={K.kulit}>
            <sphereGeometry args={[R, 40, 32]} />
          </Bagian>
          {/* telinga */}
          {[-1, 1].map((s) => (
            <Bagian key={s} gradasi={g} warna="#F4A898" posisi={[0.49 * s, -0.02, 0]} skala={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.1, 16, 12]} />
            </Bagian>
          ))}
          {/* rambut: belakang + poni + cambang */}
          {/* rambut belakang: bola sedikit lebih besar & digeser ke belakang, bagian depannya tertutup wajah */}
          <Bagian gradasi={g} warna={K.rambut} posisi={[0, 0.07, -0.07]} skala={[1.02, 0.9, 1]}>
            <sphereGeometry args={[R, 40, 32]} />
          </Bagian>
          {/* poni yang mengintip di bawah peci */}
          <Bagian gradasi={g} warna={K.rambut} posisi={[0, 0.2, 0.36]} skala={[1.75, 0.38, 0.5]} rotasi={[0.55, 0, 0]}>
            <sphereGeometry args={[0.2, 20, 12]} />
          </Bagian>
          {/* peci rajut */}
          <Bagian gradasi={g} peta={rajut} posisi={[0, 0.3, -0.01]}>
            <cylinderGeometry args={[0.47, 0.515, 0.2, 40, 1, false]} />
          </Bagian>
          <Bagian gradasi={g} peta={rajut} posisi={[0, 0.4, -0.01]} skala={[1, 0.42, 1]} garis={0.015}>
            <sphereGeometry args={[0.47, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </Bagian>
          <Bagian gradasi={g} warna={K.peciGelap} posisi={[0, 0.21, -0.01]} garis={0}>
            <cylinderGeometry args={[0.515, 0.52, 0.035, 40, 1, true]} />
          </Bagian>

          {/* mata, pipi, hidung, mulut */}
          {mata(-1)}
          {mata(1)}
          {[-1, 1].map((s) => (
            <Datar key={s} warna={K.pipi} posisi={diKepala(0.28 * s, -0.17, -0.02)} skala={[0.075, 0.045, 0.02]} rotasi={[0, 0.6 * s, 0]} opasitas={0.7} />
          ))}
          <Datar warna="#E9A687" posisi={diKepala(0, -0.12, -0.005)} skala={[0.022, 0.016, 0.012]} />
          {mulut.buka > 0.05 ? (
            <group position={diKepala(0, -0.24, -0.02)} rotation={[0.45, 0, 0]}>
              <Datar warna="#7A2E2E" posisi={[0, 0, 0]} skala={[mulut.bulat ? 0.045 : 0.07, 0.02 + mulut.buka * 0.05, 0.02]} />
              <Datar warna="#E87F7F" posisi={[0, -0.012 - mulut.buka * 0.02, 0.008]} skala={[0.035, 0.012 + mulut.buka * 0.012, 0.01]} />
            </group>
          ) : (
            // senyum tertutup (sedih: melengkung ke bawah)
            <mesh position={diKepala(0, -0.2, -0.03)} rotation={[0.45, 0, expression === 'sad' ? 0 : Math.PI]}>
              <torusGeometry args={[expression === 'sad' ? 0.04 : 0.055, 0.011, 8, 20, Math.PI]} />
              <meshBasicMaterial color="#7A2E2E" />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
};
