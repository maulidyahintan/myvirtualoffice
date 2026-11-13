// Mother's arm laid over the shoulders of the child standing at her side (action 'hugging'). Drawn over the
// child in stage coordinates, with Mother's own sleeve and skin colors.
import React from 'react';
import { Arm } from './Arm';
import { armPoseTowards, type Point } from './interactions';
import { paletIbu } from './Mother';
import { useLook } from './looks';

/** Mother's arm proportions in her 240×400 rig (see Mother.tsx). */
const UPPER = 66;
const LOWER = 58;
const THICKNESS = 26;
const RIG_HEIGHT = 400;

export const HugArm: React.FC<{ shoulder: Point; nearShoulder: Point; farShoulder: Point; motherHeight: number }> = ({
  shoulder,
  nearShoulder,
  farShoulder,
  motherHeight,
}) => {
  const palette = paletIbu(useLook('mother'));
  const scale = motherHeight / RIG_HEIGHT;
  // the upper arm reaches over the near shoulder, the forearm lies across the back to the far shoulder
  const pose = armPoseTowards(shoulder, nearShoulder, farShoulder, UPPER * scale);
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'visible', pointerEvents: 'none' }}>
      <Arm
        x={shoulder.x}
        y={shoulder.y}
        pose={pose}
        atas={UPPER * scale}
        bawah={LOWER * scale}
        tebal={THICKNESS * scale}
        warnaAtas={palette.abaya}
        warnaBawah={palette.abaya}
        warnaTangan={palette.kulit}
        garis={palette.abayaBayang}
        manset={palette.abayaAksen}
      />
    </svg>
  );
};
