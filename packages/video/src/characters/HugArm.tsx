// Mother's arms around the child at her side (action 'hugging'): the near arm over the child's shoulders, the
// far arm across her front to the child's waist. Drawn over the child in stage coordinates, with Mother's
// own sleeve and skin colors.
import React from 'react';
import { Arm } from './Arm';
import { armPoseTowards, type HugArmAim } from './interactions';
import { paletIbu } from './Mother';
import { useLook } from './looks';

/** Mother's arm proportions in her 240×400 rig (see Mother.tsx). */
const UPPER = 66;
const LOWER = 58;
const THICKNESS = 26;
const RIG_HEIGHT = 400;

export const HugArms: React.FC<{ near: HugArmAim; far: HugArmAim; motherHeight: number }> = ({ near, far, motherHeight }) => {
  const palette = paletIbu(useLook('mother'));
  const scale = motherHeight / RIG_HEIGHT;
  const arm = (aim: HugArmAim) => (
    <Arm
      x={aim.shoulder.x}
      y={aim.shoulder.y}
      pose={armPoseTowards(aim.shoulder, aim.elbowAim, aim.handAim, UPPER * scale)}
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
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'visible', pointerEvents: 'none' }}>
      {arm(far)}
      {arm(near)}
    </svg>
  );
};
