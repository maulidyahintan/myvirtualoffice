// Ali, Mamas's friend: same child figure as Mamas, but with short black hair, a green striped T-shirt and blue
// trousers in other colors, so the two boys are told apart at a glance. Colors can be changed in Settings → Karakter.
import React from 'react';
import type { RigProps } from './motion';
import { Child, K_ASLI, type ChildPalette } from './Mamas';
import { shade, useLook } from './looks';

/** Mamas's palette with the friend's own skin, hair, shirt and trousers. */
function friendPalette({ base }: ReturnType<typeof useLook>): ChildPalette {
  const { skin, hair, shirt, pants } = base;
  return {
    ...K_ASLI,
    kulit: skin,
    kulitBayang: shade(skin, -0.12),
    kulitTerang: shade(skin, 0.4),
    kulitGelap: shade(skin, -0.2),
    telinga: shade(skin, -0.06),
    telingaDalam: shade(skin, -0.14),
    rambut: hair,
    baju: shirt,
    bajuGaris: shade(shirt, -0.22),
    bajuTerang: shade(shirt, 0.45),
    bajuGelap: shade(shirt, -0.1),
    lengan: shade(shirt, -0.02),
    celana: pants,
    celanaTerang: shade(pants, 0.12),
    celanaGelap: shade(pants, -0.15),
  };
}

export const Friend: React.FC<RigProps> = (r) => <Child {...r} look={friendPalette(useLook('friend'))} outfit="tshirt" headwear="hair" />;
