// Character colors from Settings (Pengaturan → Karakter). Compositions provide them through LooksContext;
// each character keeps its exact original palette and only recomputes the parts whose base color changed.
import React, { createContext, useContext } from 'react';
import { DEFAULT_CHARACTER_LOOKS } from '@kantor/shared/constants';
import type { CharacterLooks } from '@kantor/shared/types';

export const LooksContext = createContext<CharacterLooks | undefined>(undefined);

/** Base colors for one character: defaults with the owner's overrides. */
export function useLook<C extends keyof typeof DEFAULT_CHARACTER_LOOKS>(id: C): { base: Record<string, string>; changed: (part: string) => boolean } {
  const own = (useContext(LooksContext)?.[id] ?? {}) as Record<string, string | undefined>;
  const defaults = DEFAULT_CHARACTER_LOOKS[id] as Record<string, string>;
  const base = { ...defaults, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v)) } as Record<string, string>;
  return { base, changed: (part) => base[part]?.toLowerCase() !== defaults[part]?.toLowerCase() };
}

/** Mix a hex color toward white (amount > 0) or black (amount < 0); amount in -1..1. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = (v: number) => Math.round(v + (target - v) * a);
  const [r, g, b] = [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/** Wrap a composition so the characters inside it use the colors from its `characterLooks` prop. */
export function withLooks<P extends { characterLooks?: CharacterLooks }>(Component: React.ComponentType<P>): React.FC<P> {
  const Wrapped: React.FC<P> = (props) =>
    React.createElement(LooksContext.Provider, { value: props.characterLooks }, React.createElement(Component, props));
  Wrapped.displayName = `withLooks(${Component.displayName ?? Component.name})`;
  return Wrapped;
}
