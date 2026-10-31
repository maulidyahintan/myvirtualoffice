'use client';

// Furnitur low-poly dibuat dari bentuk dasar three.js (tanpa file model),
// jadi gratis, ringan, dan tidak perlu download aset.

type V3 = [number, number, number];

const KAYU = '#D9B98C';
const KAYU_GELAP = '#B8925F';
const ABU = '#3F4147';

export function Kotak({
  p,
  s,
  c,
  bayangan = true,
}: {
  p: V3;
  s: V3;
  c: string;
  bayangan?: boolean;
}) {
  return (
    <mesh position={p} castShadow={bayangan} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

export function Lantai() {
  return (
    <group>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[16, 0.2, 12]} />
        <meshStandardMaterial color="#EAD9BF" roughness={0.95} />
      </mesh>
      {/* garis papan lantai tipis */}
      {Array.from({ length: 15 }, (_, i) => (
        <mesh key={i} position={[-7 + i, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, 12]} />
          <meshBasicMaterial color="#D8C4A5" />
        </mesh>
      ))}
    </group>
  );
}

export function Dinding() {
  const warna = '#F4EFE7';
  return (
    <group>
      <Kotak p={[0, 1.3, -6.08]} s={[16.3, 2.6, 0.16]} c={warna} />
      <Kotak p={[-8.08, 1.3, 0]} s={[0.16, 2.6, 12]} c={warna} />
      {/* panel hijau seperti partisi di referensi */}
      <Kotak p={[-8.0, 1.1, -1.4]} s={[0.04, 1.6, 2.4]} c="#A9C0A0" />
    </group>
  );
}

export function Kursi() {
  return (
    <group>
      <Kotak p={[0, 0.44, 0]} s={[0.52, 0.08, 0.5]} c={ABU} />
      <Kotak p={[0, 0.82, -0.27]} s={[0.5, 0.62, 0.07]} c={ABU} />
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 5]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

/** Meja kerja di depan karakter (karakter di origin menghadap +z). */
export function Meja({ layarNyala, warnaLayar }: { layarNyala: boolean; warnaLayar: string }) {
  return (
    <group position={[0, 0, 0.62]}>
      <Kotak p={[0, 0.76, 0]} s={[1.35, 0.05, 0.72]} c={KAYU} />
      {(
        [
          [-0.62, 0.32],
          [0.62, 0.32],
          [-0.62, -0.32],
          [0.62, -0.32],
        ] as const
      ).map(([x, z]) => (
        <Kotak key={`${x}${z}`} p={[x, 0.37, z]} s={[0.05, 0.74, 0.05]} c={KAYU_GELAP} />
      ))}
      {/* keyboard & mouse */}
      <Kotak p={[0, 0.795, -0.18]} s={[0.46, 0.02, 0.14]} c="#E6E6E6" />
      <Kotak p={[0.34, 0.795, -0.16]} s={[0.07, 0.025, 0.1]} c="#E6E6E6" />
      {/* monitor di sisi kiri, sedikit miring ke karakter supaya wajah tetap terlihat */}
      <group position={[-0.32, 0, 0]} rotation={[0, -0.32, 0]}>
        <Kotak p={[0, 0.86, 0.2]} s={[0.12, 0.16, 0.06]} c="#2A2A2E" />
        <Kotak p={[0, 1.12, 0.22]} s={[0.66, 0.4, 0.04]} c="#1E1F24" />
        <mesh position={[0, 1.12, 0.198]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.6, 0.34]} />
          <meshStandardMaterial
            color={layarNyala ? warnaLayar : '#2C2F38'}
            emissive={layarNyala ? warnaLayar : '#000000'}
            emissiveIntensity={layarNyala ? 1.1 : 0}
          />
        </mesh>
        {layarNyala ? <pointLight position={[0, 1.1, -0.1]} color={warnaLayar} intensity={1.6} distance={1.6} decay={2} /> : null}
      </group>
      {/* gelas */}
      <mesh position={[0.48, 0.83, 0.05]} castShadow>
        <cylinderGeometry args={[0.045, 0.04, 0.1, 12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

export function Tanaman({ p, skala = 1, pot = '#F2F2F2' }: { p: V3; skala?: number; pot?: string }) {
  return (
    <group position={p} scale={skala}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 14]} />
        <meshStandardMaterial color={pot} roughness={0.7} />
      </mesh>
      {[
        [0, 0.65, 0, 0.22],
        [0.12, 0.55, 0.08, 0.17],
        [-0.12, 0.58, -0.06, 0.18],
        [0.04, 0.82, -0.08, 0.15],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i % 2 ? '#5E9E57' : '#4C8A4A'} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function RuangKaca() {
  // ruang manajer di pojok kanan belakang: x 2.9..8, z -6..-1.6, pintu di dekat x 2.9
  const kaca = (p: V3, s: V3) => (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color="#CFE3EF" transparent opacity={0.22} roughness={0.1} depthWrite={false} />
    </mesh>
  );
  const rangka = '#2F3136';
  return (
    <group>
      {kaca([5.0, 1.15, -1.6], [6.0, 2.3, 0.04])}
      {kaca([2.9, 1.15, -4.4], [0.04, 2.3, 3.2])}
      {/* rangka */}
      <Kotak p={[5.0, 2.32, -1.6]} s={[6.0, 0.05, 0.06]} c={rangka} />
      <Kotak p={[2.9, 2.32, -3.8]} s={[0.06, 0.05, 4.4]} c={rangka} />
      {[2.0, 4.0, 6.0, 7.95].map((x) => (
        <Kotak key={x} p={[x, 1.15, -1.6]} s={[0.05, 2.3, 0.06]} c={rangka} />
      ))}
      {[-6.0, -4.4, -2.8].map((z) => (
        <Kotak key={z} p={[2.9, 1.15, z]} s={[0.06, 2.3, 0.05]} c={rangka} />
      ))}
      {/* rak & tanaman di ruang manajer */}
      <Kotak p={[7.3, 0.45, -5.6]} s={[1.0, 0.9, 0.5]} c={KAYU} />
      <Tanaman p={[7.3, 0.9, -5.6]} skala={0.7} />
    </group>
  );
}

export function Lounge() {
  const sofa = '#8FA88A';
  return (
    <group>
      <mesh position={[5.0, 0.006, 3.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 3.0]} />
        <meshStandardMaterial color="#D9CCB4" />
      </mesh>
      {/* sofa menghadap -z */}
      <group position={[5.2, 0, 4.2]}>
        <Kotak p={[0, 0.28, 0]} s={[2.2, 0.36, 0.85]} c={sofa} />
        <Kotak p={[0, 0.65, 0.33]} s={[2.2, 0.55, 0.22]} c={sofa} />
        <Kotak p={[-1.05, 0.48, 0]} s={[0.2, 0.42, 0.85]} c={sofa} />
        <Kotak p={[1.05, 0.48, 0]} s={[0.2, 0.42, 0.85]} c={sofa} />
        <Kotak p={[-0.5, 0.52, 0.05]} s={[0.4, 0.3, 0.12]} c="#F1EBDD" />
      </group>
      {/* meja bundar */}
      <mesh position={[4.9, 0.44, 2.6]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 28]} />
        <meshStandardMaterial color={KAYU} />
      </mesh>
      <mesh position={[4.9, 0.22, 2.6]} castShadow>
        <cylinderGeometry args={[0.05, 0.12, 0.42, 10]} />
        <meshStandardMaterial color={KAYU_GELAP} />
      </mesh>
      <Kotak p={[4.8, 0.48, 2.6]} s={[0.3, 0.03, 0.22]} c="#FFFFFF" />
      <Tanaman p={[4.3, 0.47, 2.45]} skala={0.35} />
    </group>
  );
}

/** Papan tulis di dinding belakang: stiker warna = jumlah episode per fase. */
export function PapanTulis({ fase }: { fase: { title: string; jumlah: number }[] }) {
  const warna = ['#F7D774', '#F4A6B8', '#9FD3E6', '#B7E1A1', '#C7B7F2', '#E3C9A8'];
  const lebar = 2.6;
  const kolom = lebar / fase.length;
  return (
    <group position={[-2.0, 1.55, -5.98]}>
      <Kotak p={[0, 0, 0]} s={[lebar + 0.12, 1.12, 0.05]} c="#8D8F96" />
      <Kotak p={[0, 0, 0.02]} s={[lebar, 1.0, 0.03]} c="#FBFBFB" />
      {fase.map((f, i) =>
        Array.from({ length: Math.min(f.jumlah, 6) }, (_, j) => (
          <Kotak
            key={`${i}-${j}`}
            p={[-lebar / 2 + kolom * (i + 0.5) + ((j % 2) - 0.5) * 0.18, 0.32 - Math.floor(j / 2) * 0.24, 0.045]}
            s={[0.15, 0.15, 0.01]}
            c={warna[i % warna.length]}
            bayangan={false}
          />
        )),
      )}
      {fase.slice(0, -1).map((_, i) => (
        <Kotak key={`g${i}`} p={[-lebar / 2 + kolom * (i + 1), 0, 0.04]} s={[0.01, 0.9, 0.005]} c="#D0D0D0" bayangan={false} />
      ))}
    </group>
  );
}

export function Lemari({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Kotak p={[0, 0.35, 0]} s={[1.2, 0.7, 0.5]} c={KAYU} />
      <Kotak p={[-0.3, 0.35, 0.252]} s={[0.55, 0.6, 0.01]} c={KAYU_GELAP} bayangan={false} />
      <Kotak p={[0.3, 0.35, 0.252]} s={[0.55, 0.6, 0.01]} c={KAYU_GELAP} bayangan={false} />
      <Tanaman p={[0.3, 0.7, 0]} skala={0.45} />
    </group>
  );
}
