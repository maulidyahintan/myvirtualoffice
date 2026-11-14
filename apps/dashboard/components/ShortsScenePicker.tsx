'use client';

import { useState } from 'react';
import { PICKED_SHORT_CONTENT_LIMIT_SECONDS, PICKED_SHORT_TOTAL_SECONDS, selectionProblem, selectionSeconds } from '@kantor/shared/shortsSelection';
import { shortFromPickedScenes } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

export interface PickableScene {
  /** 1-based scene number */
  number: number;
  speaker: string;
  narration: string;
  /** length of the scene in the rendered video (seconds) */
  seconds: number;
}

/** Tick the scenes of a finished video that make one Short; the total length is checked against the limit. */
export function ShortsScenePicker({ episodeId, scenes }: { episodeId: string; scenes: PickableScene[] }) {
  const [picked, setPicked] = useState<number[]>([]);
  const seconds = scenes.map((s) => s.seconds);
  const total = selectionSeconds(seconds, picked);
  const problem = selectionProblem(seconds, picked);
  const toggle = (n: number) => setPicked((now) => (now.includes(n) ? now.filter((x) => x !== n) : [...now, n].sort((a, b) => a - b)));

  return (
    <form action={shortFromPickedScenes} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="id" value={episodeId} />
      <p className="kecil muted" style={{ margin: 0 }}>
        Centang adegan yang mau dijadikan satu Shorts (urutannya tetap seperti di video). Sutradara memakai adegan pilihanmu apa adanya dan
        hanya membuatkan judul, deskripsi &amp; tag Shorts-nya.
      </p>
      <div className="stack shorts-picker" style={{ gap: 4 }}>
        {scenes.map((scene) => (
          <label key={scene.number} className={`row kecil shorts-pick${picked.includes(scene.number) ? ' aktif' : ''}`} style={{ gap: 8 }}>
            <input type="checkbox" name="adegan" value={scene.number} checked={picked.includes(scene.number)} onChange={() => toggle(scene.number)} />
            <b style={{ minWidth: 24 }}>{scene.number}</b>
            <span className="muted" style={{ minWidth: 48 }}>
              {scene.speaker}
            </span>
            <span style={{ flex: 1, minWidth: 160 }}>{scene.narration.length > 110 ? `${scene.narration.slice(0, 110)}…` : scene.narration}</span>
            <span className="muted">{Math.round(scene.seconds)} dtk</span>
          </label>
        ))}
      </div>
      {problem && picked.length ? (
        <div className="kecil peringatan">{problem}</div>
      ) : (
        <div className="kecil muted">
          Total adegan {Math.round(total)} / {PICKED_SHORT_CONTENT_LIMIT_SECONDS} detik (video jadi maks. {PICKED_SHORT_TOTAL_SECONDS} detik dengan pembuka &amp; penutup)
        </div>
      )}
      <textarea name="arahan" rows={2} placeholder="Arahan judul (opsional), misal: tekankan dzikir saat mendengar guruh" />
      <div>
        <SubmitButton type="submit" className="sekunder" disabled={Boolean(problem)} teksProses="Memulai…">
          ✂️ Buat Shorts dari {picked.length ? `adegan ${picked.join(', ')}` : 'adegan pilihan'}
        </SubmitButton>
      </div>
    </form>
  );
}
