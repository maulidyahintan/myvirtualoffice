// Lightning of the current scene: at the moments the scene asks for (`lightningAt`), or the automatic
// storm rhythm. Every storm layer (window, sky, whole-frame glow) reads it here so they flash together.
import React, { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';
import { cuedLightningFlash, lightningFlash, type LightningFlash } from './lightning';

const LightningCuesContext = createContext<readonly number[] | undefined>(undefined);

/** Scene frames at which lightning strikes in this scene; without cues the storm keeps its own rhythm. */
export const LightningCuesProvider: React.FC<{ cues?: readonly number[]; children: React.ReactNode }> = ({ cues, children }) => (
  <LightningCuesContext.Provider value={cues?.length ? cues : undefined}>{children}</LightningCuesContext.Provider>
);

/** Lightning at a frame, honouring the scene's cues. */
export function lightningAt(frame: number, cues: readonly number[] | undefined): LightningFlash {
  return cues ? cuedLightningFlash(frame, cues) : lightningFlash(frame);
}

/** Lightning of the current frame in the current scene. */
export function useLightningFlash(): LightningFlash {
  const frame = useCurrentFrame();
  return lightningAt(frame, useContext(LightningCuesContext));
}
