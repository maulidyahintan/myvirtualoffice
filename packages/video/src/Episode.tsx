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
import type { EpisodeVideoProps, HafalanVideo } from '@kantor/shared/types';
import { FPS, SPEK_FORMAT } from '@kantor/shared/constants';
import { frameIntroOutro, hitungFrameAdegan, hitungFrameHafalan, segmenHafalan, totalFrame } from '@kantor/shared/timing';
import { Adegan, gayaPanggung, jepit } from './Adegan';
import { AyatHafalanView } from './Hafalan';
import { Latar } from './backgrounds/Latar';
import { Karakter } from './characters/Karakter';
import { EfekEkspresi } from './Efek';
import { Logo } from './brand/Logo';
import { fontJudul, fontTeks, warna } from './theme';

/** Judul yang muncul kata per kata dengan pantulan. */
const JudulMemantul: React.FC<{ teks: string; mulai: number }> = ({ teks, mulai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px', maxWidth: 1500 }}>
      {teks.split(' ').map((k, i) => {
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
  biasa: { ibu: [560, 640], mamas: [980, 440], mochi: [1280, 260] },
  short: { ibu: [690, 520], mamas: [960, 360], mochi: [1120, 200] },
} as const;

const Intro: React.FC<{ namaSeri: string; judul: string; durasi: number }> = ({ namaSeri, judul, durasi }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertikal = height > width;
  const a = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const zoom = interpolate(frame, [0, durasi], [1.08, 1]);
  const susun = SUSUNAN[vertikal ? 'short' : 'biasa'];
  return (
    <AbsoluteFill>
      <Panggung zoom={zoom}>
        <Latar id="taman" />
        <div style={{ position: 'absolute', left: susun.ibu[0], top: 980 - susun.ibu[1] }}>
          <Karakter id="ibu" ekspresi="senang" bicara={false} tinggi={susun.ibu[1]} offset={20} lihatX={1} masuk={vertikal ? 'muncul' : 'kiri'} />
        </div>
        <div style={{ position: 'absolute', left: susun.mamas[0], top: 980 - susun.mamas[1] }}>
          <Karakter id="mamas" ekspresi="senang" bicara={false} tinggi={susun.mamas[1]} lambai masuk="muncul" />
        </div>
        <div style={{ position: 'absolute', left: susun.mochi[0], top: 980 - susun.mochi[1] }}>
          <Karakter id="mochi" ekspresi="senang" bicara={false} tinggi={susun.mochi[1]} offset={40} lihatX={-1} masuk={vertikal ? 'muncul' : 'kanan'} />
        </div>
      </Panggung>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: vertikal ? 170 : 50, paddingLeft: 40, paddingRight: 40 }}>
        <Logo tinggi={vertikal ? 64 : 70} animasi />
        {namaSeri ? (
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
            {namaSeri}
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
          <JudulMemantul teks={judul} mulai={vertikal ? 2 : 6} />
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
  const susun = SUSUNAN[vertikal ? 'short' : 'biasa'];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Panggung>
        <Latar id="langit-malam" />
        <div style={{ position: 'absolute', left: susun.ibu[0], top: 980 - susun.ibu[1] }}>
          <Karakter id="ibu" ekspresi="senang" bicara={false} tinggi={susun.ibu[1]} offset={15} lambai masuk="ada" />
        </div>
        <div style={{ position: 'absolute', left: susun.mamas[0], top: 980 - susun.mamas[1] }}>
          <Karakter id="mamas" ekspresi="senang" bicara={false} tinggi={susun.mamas[1]} lambai masuk="ada" />
        </div>
        <div style={{ position: 'absolute', left: susun.mochi[0], top: 980 - susun.mochi[1] }}>
          <Karakter id="mochi" ekspresi="senang" bicara={false} tinggi={susun.mochi[1]} offset={40} masuk="ada" />
        </div>
        <EfekEkspresi ekspresi="senang" x={vertikal ? 1000 : 1080} y={520} />
      </Panggung>
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: vertikal ? 260 : 130 }}>
        <div style={{ fontFamily: fontJudul, fontWeight: 700, fontSize: 96, color: '#FFF3C4', transform: `scale(${s}) rotate(${Math.sin(frame / 14) * 2}deg)` }}>
          Sampai jumpa!
        </div>
        <div style={{ fontFamily: fontTeks, fontWeight: 800, fontSize: 48, color: '#FFF3C4', marginTop: 16, opacity: s }}>
          Assalamu&apos;alaikum, adik-adik
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

/** Susun ayat hafalan: tiap ayat jadi satu sequence berisi semua bacaan ulangnya. */
function kelompokHafalan(h: HafalanVideo, frames: number[]) {
  const segmen = segmenHafalan(h.ayat, h.ulang);
  const total = frames.reduce((a, b) => a + b, 0);
  const grup = h.ayat.map(() => ({ durasi: 0, mulaiBacaan: [] as number[] }));
  segmen.forEach((s, i) => {
    grup[s.ayat].mulaiBacaan.push(grup[s.ayat].durasi);
    grup[s.ayat].durasi += frames[i] ?? FPS * 3;
  });
  return { grup, total };
}

export const Episode: React.FC<EpisodeVideoProps> = ({
  namaSeri,
  judul,
  adegan,
  fileAudio,
  frameAdegan,
  format = 'biasa',
  hafalan,
  musik,
  frameIntro,
  frameOutro,
}) => {
  const frames = frameAdegan ?? (hafalan ? hitungFrameHafalan(hafalan.ayat, hafalan.ulang) : hitungFrameAdegan(adegan));
  const bawaan = frameIntroOutro(format);
  const intro = frameIntro ?? bawaan.intro;
  const outro = (frameOutro ?? bawaan.outro) + TRANSISI;
  let mulai = intro;

  let isi: React.ReactNode;
  if (hafalan) {
    const { grup, total } = kelompokHafalan(hafalan, frames);
    const totalAyat = hafalan.ayat.filter((a) => a.nomor > 0).length;
    let lewat = 0;
    let keAyat = 0;
    isi = hafalan.ayat.map((a, i) => {
      const dari = mulai;
      const g = grup[i];
      mulai += g.durasi;
      if (a.nomor > 0) keAyat += 1;
      const progres: [number, number] = [lewat / total, (lewat + g.durasi) / total];
      lewat += g.durasi;
      return (
        <Sequence key={i} from={dari - TRANSISI} durationInFrames={g.durasi + TRANSISI} name={a.nomor ? `Ayat ${a.nomor}` : 'Basmalah'}>
          <AyatHafalanView
            ayat={a}
            namaSurat={hafalan.namaSurat}
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
    isi = adegan.map((a, i) => {
      const dari = mulai;
      mulai += frames[i];
      return (
        <Sequence key={i} from={dari - TRANSISI} durationInFrames={frames[i] + TRANSISI} name={`Adegan ${i + 1}`}>
          <Adegan
            data={a}
            durasi={frames[i] + TRANSISI}
            denganSubtitle
            indeks={i}
            sebelumnya={i > 0 && adegan[i - 1].jenis !== 'doa' ? adegan[i - 1].karakter : []}
            transisi={TRANSISI}
          />
        </Sequence>
      );
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence durationInFrames={intro} name="Intro">
        <Intro namaSeri={namaSeri} judul={judul} durasi={intro} />
      </Sequence>

      {isi}

      <Sequence from={mulai - TRANSISI} durationInFrames={outro} name="Outro">
        <Outro />
      </Sequence>

      {musik?.pembuka ? (
        <Sequence durationInFrames={intro} name="Musik pembuka">
          <Musik src={musik.pembuka} volume={musik.volume} durasi={intro} />
        </Sequence>
      ) : null}
      {musik?.penutup ? (
        <Sequence from={mulai - TRANSISI} durationInFrames={outro} name="Musik penutup">
          <Musik src={musik.penutup} volume={musik.volume} durasi={outro} />
        </Sequence>
      ) : null}

      {fileAudio ? (
        <Sequence from={intro} name="Rekaman suara">
          <Html5Audio src={staticFile(fileAudio)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const hitungMetadataEpisode: CalculateMetadataFunction<EpisodeVideoProps> = async ({ props }) => {
  const durasiAudio = props.fileAudio ? await getAudioDurationInSeconds(staticFile(props.fileAudio)) : undefined;
  const frameAdegan = props.hafalan
    ? hitungFrameHafalan(props.hafalan.ayat, props.hafalan.ulang, durasiAudio, props.hafalan.mulaiSegmen)
    : hitungFrameAdegan(props.adegan, durasiAudio);
  const format = props.format ?? 'biasa';
  const detik = async (m?: string) => (m ? getAudioDurationInSeconds(staticFile(m)) : undefined);
  const { intro: frameIntro, outro: frameOutro } = frameIntroOutro(format, await detik(props.musik?.pembuka), await detik(props.musik?.penutup));
  return {
    durationInFrames: totalFrame(frameAdegan, format, frameIntro, frameOutro),
    // ukuran video mengikuti format: 1920x1080 (biasa) atau 1080x1920 (Shorts)
    width: SPEK_FORMAT[format].lebar,
    height: SPEK_FORMAT[format].tinggi,
    props: { ...props, frameAdegan, frameIntro, frameOutro },
  };
};
