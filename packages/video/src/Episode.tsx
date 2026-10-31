import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  Sequence,
  staticFile,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import type { EpisodeVideoProps, MemorizationVideo } from '@kantor/shared/types';
import { FPS, FORMAT_SPEC } from '@kantor/shared/constants';
import { introOutroFrames, sceneFrames, memorizationFrames, memorizationSegments, totalFrames } from '@kantor/shared/timing';
import { SceneView, gayaPanggung, jepit } from './Adegan';
import { AyatHafalanView } from './Hafalan';
import { Backdrop } from './backgrounds/Latar';
import { CharacterFigure } from './characters/Karakter';
import { EfekEkspresi } from './Efek';
import { Logo } from './brand/Logo';
import { fontJudul, fontTeks, warna } from './theme';

/** Judul yang muncul kata per kata dengan pantulan. */
const JudulMemantul: React.FC<{ text: string; mulai: number }> = ({ text, mulai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px', maxWidth: 1500 }}>
      {text.split(' ').map((k, i) => {
        const s = spring({ frame: frame - mulai - i * 4, fps, config: { damping: 9, stiffness: 160 } });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - s) * -120}px) rotate(${(1 - s) * (i % 2 ? 12 : -12) + Math.sin(frame / 15 + i) * 2}deg)`,
              opacity: Math.min(1, s * 2),
            }}
          >
            {k}
          </span>
        );
      })}
    </div>
  );
};

/** Panggung 1920x1080 yang otomatis dipotong pas untuk frame biasa maupun Shorts. */
const Panggung: React.FC<{ children: React.ReactNode; zoom?: number }> = ({ children, zoom = 1 }) => {
  const { width, height } = useVideoConfig();
  return <div style={gayaPanggung(jepit({ x: 975, y: 540, z: zoom }, width, height), width, height)}>{children}</div>;
};

/** Posisi karakter di intro/outro: [kiri, tinggi] per karakter, beda untuk 16:9 dan 9:16. */
const SUSUNAN = {
  standard: { mother: [560, 640], mamas: [980, 440], mochi: [1280, 260] },
  short: { mother: [690, 520], mamas: [960, 360], mochi: [1120, 200] },
} as const;

const Intro: React.FC<{ seriesName: string; title: string; durasi: number }> = ({ seriesName, title, durasi }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertikal = height > width;
  const a = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const zoom = interpolate(frame, [0, durasi], [1.08, 1]);
  const susun = SUSUNAN[vertikal ? 'short' : 'standard'];
  return (
    <AbsoluteFill>
      <Panggung zoom={zoom}>
        <Backdrop id="garden" />
        <div style={{ position: 'absolute', left: susun.mother[0], top: 980 - susun.mother[1] }}>
          <CharacterFigure id="mother" expression="happy" bicara={false} tinggi={susun.mother[1]} offset={20} lihatX={1} masuk={vertikal ? 'muncul' : 'kiri'} />
        </div>
        <div style={{ position: 'absolute', left: susun.mamas[0], top: 980 - susun.mamas[1] }}>
          <CharacterFigure id="mamas" expression="happy" bicara={false} tinggi={susun.mamas[1]} lambai masuk="muncul" />
        </div>
        <div style={{ position: 'absolute', left: susun.mochi[0], top: 980 - susun.mochi[1] }}>
          <CharacterFigure id="mochi" expression="happy" bicara={false} tinggi={susun.mochi[1]} offset={40} lihatX={-1} masuk={vertikal ? 'muncul' : 'kanan'} />
        </div>
      </Panggung>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: vertikal ? 170 : 50, paddingLeft: 40, paddingRight: 40 }}>
        <Logo tinggi={vertikal ? 64 : 70} animasi />
        {seriesName ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: fontTeks,
              fontWeight: 800,
              fontSize: 36,
              color: '#2F6F5E',
              opacity: a,
              background: 'rgba(255,255,255,0.75)',
              padding: '4px 26px',
              borderRadius: 999,
            }}
          >
            {seriesName}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 24,
            fontFamily: fontJudul,
            fontWeight: 700,
            fontSize: vertikal ? 92 : 100,
            color: warna.teksGelap,
            textAlign: 'center',
            lineHeight: 1.1,
            WebkitTextStroke: '3px #ffffff',
            paintOrder: 'stroke',
          }}
        >
          <JudulMemantul text={title} mulai={vertikal ? 2 : 6} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertikal = height > width;
  const a = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const s = spring({ frame: frame - 8, fps, config: { damping: 8, stiffness: 120 } });
  const susun = SUSUNAN[vertikal ? 'short' : 'standard'];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Panggung>
        <Backdrop id="night-sky" />
        <div style={{ position: 'absolute', left: susun.mother[0], top: 980 - susun.mother[1] }}>
          <CharacterFigure id="mother" expression="happy" bicara={false} tinggi={susun.mother[1]} offset={15} lambai masuk="ada" />
        </div>
        <div style={{ position: 'absolute', left: susun.mamas[0], top: 980 - susun.mamas[1] }}>
          <CharacterFigure id="mamas" expression="happy" bicara={false} tinggi={susun.mamas[1]} lambai masuk="ada" />
        </div>
        <div style={{ position: 'absolute', left: susun.mochi[0], top: 980 - susun.mochi[1] }}>
          <CharacterFigure id="mochi" expression="happy" bicara={false} tinggi={susun.mochi[1]} offset={40} masuk="ada" />
        </div>
        <EfekEkspresi expression="happy" x={vertikal ? 1000 : 1080} y={520} />
      </Panggung>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: vertikal ? 260 : 130 }}>
        <div style={{ fontFamily: fontJudul, fontWeight: 700, fontSize: 96, color: '#FFF3C4', transform: `scale(${s}) rotate(${Math.sin(frame / 14) * 2}deg)` }}>
          Sampai jumpa!
        </div>
        {vertikal ? (
          <div style={{ marginTop: 40, opacity: s }}>
            <Logo tinggi={60} />
          </div>
        ) : null}
      </AbsoluteFill>
      {vertikal ? null : (
        <div style={{ position: 'absolute', left: 60, bottom: 40, opacity: s }}>
          <Logo tinggi={56} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Lama transisi antar adegan (frame). Adegan baru mulai menimpa adegan lama selama ini. */
const TRANSISI = 14;

/** Musik pembuka/penutup: masuk lembut, keluar pelan di akhir bagiannya. */
const Musik: React.FC<{ src: string; volume: number; durasi: number }> = ({ src, volume, durasi }) => (
  <Html5Audio
    src={staticFile(src)}
    volume={(f) =>
      volume *
      interpolate(f, [0, 6, durasi - FPS, durasi], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    }
  />
);

/** Susun ayat memorization: tiap ayat jadi satu sequence berisi semua bacaan ulangnya. */
function kelompokHafalan(h: MemorizationVideo, frames: number[]) {
  const segmen = memorizationSegments(h.verses, h.repetitions);
  const total = frames.reduce((a, b) => a + b, 0);
  const grup = h.verses.map(() => ({ durasi: 0, mulaiBacaan: [] as number[] }));
  segmen.forEach((s, i) => {
    grup[s.verse].mulaiBacaan.push(grup[s.verse].durasi);
    grup[s.verse].durasi += frames[i] ?? FPS * 3;
  });
  return { grup, total };
}

export const Episode: React.FC<EpisodeVideoProps> = ({
  seriesName,
  title,
  scenes,
  audioFile,
  sceneFrames: sceneFrameCounts,
  format = 'standard',
  memorization,
  music,
  introFrame,
  outroFrame,
}) => {
  const frames = sceneFrameCounts ?? (memorization ? memorizationFrames(memorization.verses, memorization.repetitions) : sceneFrames(scenes));
  const bawaan = introOutroFrames(format);
  const intro = introFrame ?? bawaan.intro;
  const outro = (outroFrame ?? bawaan.outro) + TRANSISI;
  let mulai = intro;

  let isi: React.ReactNode;
  if (memorization) {
    const { grup, total } = kelompokHafalan(memorization, frames);
    const totalAyat = memorization.verses.filter((a) => a.number > 0).length;
    let lewat = 0;
    let keAyat = 0;
    isi = memorization.verses.map((a, i) => {
      const dari = mulai;
      const g = grup[i];
      mulai += g.durasi;
      if (a.number > 0) keAyat += 1;
      const progres: [number, number] = [lewat / total, (lewat + g.durasi) / total];
      lewat += g.durasi;
      return (
        <Sequence key={i} from={dari - TRANSISI} durationInFrames={g.durasi + TRANSISI} name={a.number ? `Ayat ${a.number}` : 'Basmalah'}>
          <AyatHafalanView
            verse={a}
            surahName={memorization.surahName}
            keAyat={keAyat}
            totalAyat={totalAyat}
            mulaiBacaan={g.mulaiBacaan}
            durasi={g.durasi + TRANSISI}
            transisi={TRANSISI}
            indeks={i}
            progres={progres}
          />
        </Sequence>
      );
    });
  } else {
    isi = scenes.map((a, i) => {
      const dari = mulai;
      mulai += frames[i];
      return (
        <Sequence key={i} from={dari - TRANSISI} durationInFrames={frames[i] + TRANSISI} name={`Adegan ${i + 1}`}>
          <SceneView
            data={a}
            durasi={frames[i] + TRANSISI}
            denganSubtitle
            indeks={i}
            sebelumnya={i > 0 && scenes[i - 1].type !== 'prayer' ? scenes[i - 1].characters : []}
            transisi={TRANSISI}
            latarBaru={i === 0 || scenes[i - 1].background !== a.background}
          />
        </Sequence>
      );
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence durationInFrames={intro} name="Intro">
        <Intro seriesName={seriesName} title={title} durasi={intro} />
      </Sequence>

      {isi}

      <Sequence from={mulai - TRANSISI} durationInFrames={outro} name="Outro">
        <Outro />
      </Sequence>

      {music?.intro ? (
        <Sequence durationInFrames={intro} name="Musik pembuka">
          <Musik src={music.intro} volume={music.volume} durasi={intro} />
        </Sequence>
      ) : null}
      {music?.outro ? (
        <Sequence from={mulai - TRANSISI} durationInFrames={outro} name="Musik penutup">
          <Musik src={music.outro} volume={music.volume} durasi={outro} />
        </Sequence>
      ) : null}

      {audioFile ? (
        <Sequence from={intro} name="Rekaman suara">
          <Html5Audio src={staticFile(audioFile)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const hitungMetadataEpisode: CalculateMetadataFunction<EpisodeVideoProps> = async ({ props }) => {
  const durasiAudio = props.audioFile ? await getAudioDurationInSeconds(staticFile(props.audioFile)) : undefined;
  const sceneFrameCounts = props.memorization
    ? memorizationFrames(props.memorization.verses, props.memorization.repetitions, durasiAudio, props.memorization.segmentStarts)
    : sceneFrames(props.scenes, durasiAudio, props.sceneStarts);
  const format = props.format ?? 'standard';
  const detik = async (m?: string) => (m ? getAudioDurationInSeconds(staticFile(m)) : undefined);
  const { intro: introFrame, outro: outroFrame } = introOutroFrames(format, await detik(props.music?.intro), await detik(props.music?.outro));
  return {
    durationInFrames: totalFrames(sceneFrameCounts, format, introFrame, outroFrame),
    // ukuran video mengikuti format: 1920x1080 (biasa) atau 1080x1920 (Shorts)
    width: FORMAT_SPEC[format].width,
    height: FORMAT_SPEC[format].height,
    props: { ...props, sceneFrames: sceneFrameCounts, introFrame, outroFrame },
  };
};
