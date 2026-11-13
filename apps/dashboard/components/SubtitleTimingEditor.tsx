'use client';

import { useRef, useState } from 'react';
import { moveSubtitle } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

export interface SubtitleSceneRow {
  /** 1-based scene number */
  scene: number;
  speaker: string;
  lines: { text: string; start: number }[];
}

/** Seconds as m:ss.s, e.g. 1:04.5 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${rest}`;
}

/**
 * The rendered video with its subtitle lines underneath: click a time to jump there, nudge a line a little
 * earlier or later, or pause where the voice says it and press "Pas di sini". Changes apply at the next render.
 */
export function SubtitleTimingEditor({
  episodeId,
  videoSrc,
  isShort,
  scenes,
  nudgeSeconds,
}: {
  episodeId: string;
  videoSrc: string;
  isShort: boolean;
  scenes: SubtitleSceneRow[];
  nudgeSeconds: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(0);
  const all = scenes.flatMap((s) => s.lines.map((l) => l.start));
  const showing = all.findLastIndex((start) => now >= start);
  // index of each scene's first line in the whole list, to highlight the line on screen
  const firstLine = scenes.map((_, k) => scenes.slice(0, k).reduce((sum, s) => sum + s.lines.length, 0));

  const jump = (seconds: number) => {
    if (!video.current) return;
    video.current.currentTime = seconds;
    setNow(seconds);
  };

  return (
    <div className="stack">
      <video
        ref={video}
        controls
        preload="metadata"
        src={videoSrc}
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        style={isShort ? { maxWidth: 360, aspectRatio: '9 / 16', margin: '0 auto' } : undefined}
      />
      <details className="kecil">
        <summary>🕐 Atur waktu subtitle</summary>
        <p className="muted" style={{ margin: '6px 0' }}>
          Putar videonya. Kalau teks muncul terlalu cepat atau terlambat, jeda tepat saat suaranya mengucapkan kalimat itu lalu klik{' '}
          <b>⏱ Pas di sini</b> pada baris tersebut, atau geser {nudgeSeconds} detik. Klik waktu untuk melompat ke sana. Perubahan masuk ke video
          setelah dirender ulang.
        </p>
        <div className="stack subtitle-editor" style={{ gap: 10 }}>
          {scenes.map((scene, k) => (
            <div key={scene.scene} className="stack" style={{ gap: 4 }}>
              <b>
                Adegan {scene.scene} <span className="muted">· {scene.speaker}</span>
              </b>
              {scene.lines.map((line, i) => {
                const isShowing = firstLine[k] + i === showing;
                return (
                  <div key={i} className={`row subtitle-line${isShowing ? ' aktif' : ''}`} style={{ gap: 6 }}>
                    <button type="button" className="sekunder" onClick={() => jump(line.start)} title="Lompat ke sini">
                      {formatTime(line.start)}
                    </button>
                    <span style={{ flex: 1, minWidth: 160 }}>{line.text}</span>
                    {[-nudgeSeconds, nudgeSeconds].map((delta) => (
                      <form key={delta} action={moveSubtitle}>
                        <input type="hidden" name="id" value={episodeId} />
                        <input type="hidden" name="adegan" value={scene.scene} />
                        <input type="hidden" name="baris" value={i} />
                        <input type="hidden" name="geser" value={delta} />
                        <SubmitButton className="sekunder" teksProses="…" title={delta < 0 ? 'Munculkan lebih cepat' : 'Munculkan lebih lambat'}>
                          {delta < 0 ? `◀ ${nudgeSeconds}` : `${nudgeSeconds} ▶`}
                        </SubmitButton>
                      </form>
                    ))}
                    <form action={moveSubtitle}>
                      <input type="hidden" name="id" value={episodeId} />
                      <input type="hidden" name="adegan" value={scene.scene} />
                      <input type="hidden" name="baris" value={i} />
                      <input type="hidden" name="waktu" value={now.toFixed(2)} />
                      <SubmitButton className="sekunder" teksProses="…" title={`Teks ini muncul di ${formatTime(now)}`}>
                        ⏱ Pas di sini
                      </SubmitButton>
                    </form>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
