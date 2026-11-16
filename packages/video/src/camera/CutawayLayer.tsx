// A cutaway: another place full screen over the scene (no characters), slowly drifting, cross-fading in and out.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Background } from '@kantor/shared/types';
import { Backdrop } from '../backgrounds/Backdrop';
import { clampCamera, stageStyle } from '../SceneView';
import { cutawayAt, type CutawayWindow } from './cutaways';

const CROSS_FADE_FRAMES = 10;
/** The place drifts and zooms in a little while it is shown. */
const DRIFT_PX = 90;
const ZOOM_FROM = 1.04;
const ZOOM_TO = 1.14;

export const CutawayLayer: React.FC<{ windows: CutawayWindow<Background>[] }> = ({ windows }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shown = cutawayAt(windows, frame);
  if (!shown) return null;
  const t = interpolate(frame, [shown.start, shown.end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(
    interpolate(frame - shown.start, [0, CROSS_FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' }),
    interpolate(shown.end - frame, [0, CROSS_FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' }),
  );
  const camera = clampCamera({ z: ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * t, x: 960 + (t - 0.5) * DRIFT_PX, y: 540 }, width, height);
  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden', backgroundColor: '#000' }}>
      <div style={stageStyle(camera, width, height)}>
        <Backdrop id={shown.background} />
      </div>
    </AbsoluteFill>
  );
};
