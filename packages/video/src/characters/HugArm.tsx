// Mother's arms around the child at her side (action 'hugging'), in stage coordinates with her own sleeve and
// skin colors. The near arm goes around the child's back, so it is drawn behind the child and only its hand
// shows, holding the far shoulder; the far arm wraps the child's waist in front.
import React from 'react';
import { Arm } from './Arm';
import { armEnd, armPoseTowards, type HugArmAim } from './interactions';
import { paletIbu } from './Mother';
import { useLook } from './looks';

/** Mother's arm proportions in her 240×400 rig (see Mother.tsx). */
const UPPER = 66;
const LOWER = 58;
const THICKNESS = 26;
const RIG_HEIGHT = 400;
/** The hand on the child's far shoulder, seen over the shoulder from behind (rig units). */
const HAND_RX = 15;
const HAND_RY = 11;
const HAND_TILT_DEG = -25;

export const HugArms: React.FC<{ near: HugArmAim; far: HugArmAim; motherHeight: number; layer: 'behind' | 'front' }> = ({
  near,
  far,
  motherHeight,
  layer,
}) => {
  const palette = paletIbu(useLook('mother'));
  const scale = motherHeight / RIG_HEIGHT;
  const poseOf = (aim: HugArmAim) => armPoseTowards(aim.shoulder, aim.elbowAim, aim.handAim, UPPER * scale);
  const arm = (aim: HugArmAim) => (
    <Arm
      x={aim.shoulder.x}
      y={aim.shoulder.y}
      pose={poseOf(aim)}
      atas={UPPER * scale}
      bawah={LOWER * scale}
      tebal={THICKNESS * scale}
      warnaAtas={palette.abaya}
      warnaBawah={palette.abaya}
      warnaTangan={palette.kulit}
      garis={palette.abayaBayang}
      manset={palette.abayaAksen}
    />
  );
  const hand = armEnd(near.shoulder, poseOf(near), UPPER * scale, LOWER * scale);
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'visible', pointerEvents: 'none' }}>
      {layer === 'behind' ? (
        arm(near)
      ) : (
        <>
          {arm(far)}
          {/* fingers curled over the child's far shoulder, from the arm behind its back */}
          <g transform={`translate(${hand.x} ${hand.y}) rotate(${HAND_TILT_DEG}) scale(${scale})`}>
            <ellipse rx={HAND_RX} ry={HAND_RY} fill={palette.kulit} stroke={palette.abayaBayang} strokeWidth={2} />
            <path d={`M${-HAND_RX * 0.4} ${-HAND_RY * 0.2} v${HAND_RY * 0.9} M0 ${-HAND_RY * 0.1} v${HAND_RY} M${HAND_RX * 0.4} 0 v${HAND_RY * 0.8}`} stroke={palette.abayaBayang} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
          </g>
        </>
      )}
    </svg>
  );
};
