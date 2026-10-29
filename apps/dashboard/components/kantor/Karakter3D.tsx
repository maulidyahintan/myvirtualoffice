'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { Keadaan, PegawaiDef } from './pegawai';

const KULIT = '#F2C7A0';

function Lengan({ sisi, refLengan, warna }: { sisi: 1 | -1; refLengan: React.Ref<Group>; warna: string }) {
  // pivot di bahu, lengan mengarah ke keyboard
  return (
    <group ref={refLengan} position={[0.2 * sisi, 1.0, 0.02]} rotation={[-1.05, 0, 0]}>
      <mesh position={[0, -0.18, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.28, 4, 8]} />
        <meshStandardMaterial color={warna} />
      </mesh>
      <mesh position={[0, -0.38, 0]} castShadow>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={KULIT} />
      </mesh>
    </group>
  );
}

export function Karakter3D({
  def,
  keadaan,
  terpilih,
  onPilih,
}: {
  def: PegawaiDef;
  keadaan: Keadaan;
  terpilih: boolean;
  onPilih: () => void;
}) {
  const badan = useRef<Group>(null);
  const kepala = useRef<Group>(null);
  const kiri = useRef<Group>(null);
  const kanan = useRef<Group>(null);
  const cincin = useRef<Mesh>(null);
  const offset = def.posisi[0] * 1.7 + def.posisi[1];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + offset;
    const kerja = keadaan === 'kerja';
    if (badan.current) badan.current.position.y = Math.sin(t * 1.6) * 0.008;
    if (kiri.current && kanan.current) {
      // mengetik saat kerja, tangan diam saat santai
      const amp = kerja ? 0.12 : 0;
      kiri.current.rotation.x = -1.05 + Math.sin(t * 14) * amp;
      kanan.current.rotation.x = -1.05 + Math.sin(t * 14 + 1.7) * amp;
    }
    if (kepala.current) {
      if (keadaan === 'tunggu') kepala.current.rotation.y = Math.sin(t * 0.9) * 0.45; // menengok, menunggu
      else if (kerja) {
        kepala.current.rotation.y = Math.sin(t * 0.5) * 0.08;
        kepala.current.rotation.x = 0.08 + Math.sin(t * 3) * 0.02;
      } else {
        kepala.current.rotation.y = Math.sin(t * 0.3) * 0.25;
        kepala.current.rotation.x = -0.05;
      }
    }
    if (cincin.current) {
      const s = 1 + Math.sin(t * 3) * 0.06;
      cincin.current.scale.set(s, s, 1);
    }
  });

  const warnaStatus = keadaan === 'kerja' ? '#22A06B' : keadaan === 'tunggu' ? '#E2A23B' : '#A8A8A8';

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onPilih();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* cincin status di lantai */}
      {keadaan !== 'santai' || terpilih ? (
        <mesh ref={cincin} position={[0, 0.012, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.53, 40]} />
          <meshBasicMaterial color={terpilih ? '#3B82F6' : warnaStatus} transparent opacity={0.85} />
        </mesh>
      ) : null}

      <group ref={badan}>
        {/* kaki duduk */}
        {[-0.1, 0.1].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.53, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.065, 0.26, 4, 8]} />
              <meshStandardMaterial color="#4B5563" />
            </mesh>
            <mesh position={[x, 0.28, 0.33]} castShadow>
              <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
              <meshStandardMaterial color="#4B5563" />
            </mesh>
            <mesh position={[x, 0.05, 0.38]} castShadow>
              <boxGeometry args={[0.1, 0.07, 0.18]} />
              <meshStandardMaterial color="#2B2B2B" />
            </mesh>
          </group>
        ))}

        {/* badan */}
        <mesh position={[0, 0.82, -0.02]} castShadow>
          <capsuleGeometry args={[0.18, 0.3, 6, 12]} />
          <meshStandardMaterial color={def.warnaBaju} />
        </mesh>
        <Lengan sisi={-1} refLengan={kiri} warna={def.warnaBaju} />
        <Lengan sisi={1} refLengan={kanan} warna={def.warnaBaju} />

        {/* kepala */}
        <group ref={kepala} position={[0, 1.2, 0]}>
          {def.gaya === 'kerudung' ? (
            <>
              <mesh position={[0, 0.01, -0.03]} castShadow>
                <sphereGeometry args={[0.195, 20, 16]} />
                <meshStandardMaterial color={def.warnaAksen} />
              </mesh>
              <mesh position={[0, -0.17, -0.02]} castShadow>
                <cylinderGeometry args={[0.15, 0.25, 0.18, 18]} />
                <meshStandardMaterial color={def.warnaAksen} />
              </mesh>
              <mesh position={[0, -0.01, 0.035]}>
                <sphereGeometry args={[0.15, 20, 16]} />
                <meshStandardMaterial color={KULIT} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, 0.02, -0.02]} castShadow>
                <sphereGeometry args={[0.168, 20, 16]} />
                <meshStandardMaterial color="#2E221C" />
              </mesh>
              <mesh position={[0, 0, 0.012]} castShadow>
                <sphereGeometry args={[0.16, 20, 16]} />
                <meshStandardMaterial color={KULIT} />
              </mesh>
              <mesh position={[0, 0.13, -0.01]} castShadow>
                <cylinderGeometry args={[0.15, 0.155, 0.1, 20]} />
                <meshStandardMaterial color={def.warnaAksen} />
              </mesh>
            </>
          )}
          {/* mata & pipi */}
          {[-0.055, 0.055].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.02, 0.165]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshBasicMaterial color="#2A2220" />
              </mesh>
              <mesh position={[x * 1.6, -0.04, 0.15]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial color="#F2A0A0" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

    </group>
  );
}
