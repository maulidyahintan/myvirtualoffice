'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { RefObject } from 'react';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { Character3D } from './Character3D';
import { Walls, Chair, Floor, Cabinet, Lounge, Desk, Whiteboard, GlassRoom, Plant } from './Furniture';
import { STAFF, type OfficeData, type StaffId } from './staff';

export type BubbleRefs = RefObject<Partial<Record<StaffId, HTMLDivElement | null>>>;

/** Setiap frame, pindahkan gelembung HTML ke posisi layar di atas kepala tiap pegawai. */
function Projector({ gelembung }: { gelembung: BubbleRefs }) {
  const v = new Vector3();
  useFrame(({ camera, size }) => {
    for (const p of STAFF) {
      const el = gelembung.current?.[p.id];
      if (!el) continue;
      v.set(p.posisi[0], 1.85, p.posisi[1]).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.visibility = 'visible';
      // gelembung yang lebih dekat ke kamera tampil di atas
      el.style.zIndex = String(Math.round(100 + (p.posisi[0] + p.posisi[1]) * 3));
    }
  });
  return null;
}

export default function Scene({
  data,
  terpilih,
  onPilih,
  gelembung,
}: {
  data: OfficeData;
  terpilih: StaffId | null;
  onPilih: (id: StaffId | null) => void;
  gelembung: BubbleRefs;
}) {
  const status = new Map(data.pegawai.map((p) => [p.id, p]));

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }} onPointerMissed={() => onPilih(null)}>
      <OrthographicCamera makeDefault position={[15, 14, 15]} zoom={56} near={-50} far={200} />
      <OrbitControls
        target={[-0.6, 0.4, -0.6]}
        enableDamping
        minZoom={28}
        maxZoom={110}
        minPolarAngle={0.55}
        maxPolarAngle={1.15}
        minAzimuthAngle={0.2}
        maxAzimuthAngle={1.35}
      />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#FFFFFF', '#D8C7AE', 0.55]} />
      <directionalLight
        position={[9, 16, 7]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />

      <Projector gelembung={gelembung} />
      <Floor />
      <Walls />
      <GlassRoom />
      <Lounge />
      <Whiteboard fase={data.fase} />
      <Cabinet p={[-0.8, 0, 4.8]} />
      <Plant p={[-7.4, 0, -5.4]} skala={1.1} />
      <Plant p={[-7.4, 0, 5.3]} skala={0.9} />
      <Plant p={[2.3, 0, 5.2]} skala={1.2} />
      <Plant p={[2.4, 0, -5.4]} skala={0.8} pot="#C98F6B" />

      {STAFF.map((def) => {
        const s = status.get(def.id);
        const keadaan = s?.keadaan ?? 'santai';
        return (
          <group key={def.id} position={[def.posisi[0], 0, def.posisi[1]]}>
            <Chair />
            <Desk layarNyala={keadaan !== 'santai'} warnaLayar={def.warnaLayar} />
            <Character3D
              def={def}
              keadaan={keadaan}
              terpilih={terpilih === def.id}
              onPilih={() => onPilih(terpilih === def.id ? null : def.id)}
            />
          </group>
        );
      })}
    </Canvas>
  );
}
