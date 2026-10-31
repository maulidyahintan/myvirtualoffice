import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { Expression } from '@kantor/shared/types';
import { Backdrop } from './backgrounds/Backdrop';
import { Mamas3D } from './characters3d/Mamas3D';
import { titleFont, warna } from './theme';

// PROTOTIPE: Mamas 3D di depan latar 2D yang sudah ada, untuk menilai arah gaya 3D.
// Urutan: berputar (turntable) sambil melambai → bicara sambil kamera mengorbit → kaget → berpikir → senang.

const BABAK: { sampai: number; expression: Expression; bicara: boolean; lambai: boolean; label: string }[] = [
  { sampai: 90, expression: 'happy', bicara: false, lambai: true, label: 'Melambai (berputar 360°)' },
  { sampai: 210, expression: 'happy', bicara: true, lambai: false, label: 'Bicara, kamera mengorbit' },
  { sampai: 260, expression: 'surprised', bicara: false, lambai: false, label: 'Kaget' },
  { sampai: 320, expression: 'thinking', bicara: false, lambai: false, label: 'Berpikir' },
  { sampai: 390, expression: 'happy', bicara: false, lambai: false, label: 'Senang (melompat)' },
];
export const PROTOTYPE_3D_DURATION = BABAK.at(-1)!.sampai;

export const Prototype3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const babak = BABAK.find((b) => frame < b.sampai) ?? BABAK.at(-1)!;

  // putaran tokoh: satu putaran penuh di awal, lalu mengorbit pelan kiri-kanan
  const putar =
    frame < 90
      ? interpolate(frame, [0, 90], [0, Math.PI * 2], { easing: Easing.inOut(Easing.cubic) })
      : Math.sin((frame - 90) / 55) * 0.75;
  // kamera: dolly-in saat bicara, sedikit naik-turun
  const jarak = interpolate(frame, [90, 210, 260, 390], [5.6, 4.2, 3.6, 5.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const tinggiKam = 1.15 + Math.sin(frame / 80) * 0.15;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: 'blur(3px)', transform: 'scale(1.05)' }}>
        <Backdrop id="garden" />
      </AbsoluteFill>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, tinggiKam, jarak] }} gl={{ antialias: true }} flat>
        <Kamera posisi={[0, tinggiKam, jarak]} lihatY={0.95} />
        <ambientLight intensity={1.1} />
        <hemisphereLight args={['#FFF6E0', '#7BBE6A', 0.6]} />
        <directionalLight position={[-3, 5, 4]} intensity={1.6} />
        <group position={[0, -0.05, 0]} rotation={[0, putar, 0]}>
          <Mamas3D frame={frame} expression={babak.expression} bicara={babak.bicara} lambai={babak.lambai} />
        </group>
      </ThreeCanvas>
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 50,
          fontFamily: titleFont,
          fontSize: 44,
          color: warna.teksGelap,
          background: 'rgba(255,255,255,0.85)',
          padding: '8px 28px',
          borderRadius: 999,
        }}
      >
        Prototipe 3D · {babak.label}
      </div>
    </AbsoluteFill>
  );
};

/** Kamera diposisikan & diarahkan ke tokoh setiap frame (props `camera` hanya dipakai saat awal). */
const Kamera: React.FC<{ posisi: [number, number, number]; lihatY: number }> = ({ posisi, lihatY }) => {
  const { camera } = useThree();
  camera.position.set(...posisi);
  camera.lookAt(0, lihatY, 0);
  return null;
};
