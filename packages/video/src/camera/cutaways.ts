// Cutaways: for a while the scene shows another place (a night sky, the desert, the dawn) full screen, without
// the characters, then comes back to them. Used for stories told by a narrator or Mother, e.g. about the
// Prophet ﷺ, who is never drawn. Pure, unit-tested.

export interface Cutaway<B extends string = string> {
  background: B;
  /** Words of the narration where the cutaway starts. */
  at: string;
  /** Words where it ends (back to the characters); without it, at the next cutaway or after a few seconds. */
  until?: string;
}

export interface CutawayWindow<B extends string = string> {
  background: B;
  start: number;
  end: number;
}

/** Shortest cutaway worth showing (frames), so a cut never just flickers. */
const MIN_CUTAWAY_FRAMES = 30;

/**
 * Frame windows of a scene's cutaways, in order and without overlaps. `frameOf` finds the frame of a phrase
 * (undefined when the narration lacks it); a cutaway without an end lasts `defaultFrames` or until the next.
 */
export function cutawayWindows<B extends string>(
  cutaways: readonly Cutaway<B>[],
  frameOf: (phrase: string) => number | undefined,
  duration: number,
  defaultFrames: number,
): CutawayWindow<B>[] {
  const starts = cutaways
    .map((c) => ({ cutaway: c, start: frameOf(c.at) }))
    .filter((c): c is { cutaway: Cutaway<B>; start: number } => c.start !== undefined && c.start < duration)
    .sort((a, b) => a.start - b.start);
  const windows: CutawayWindow<B>[] = [];
  starts.forEach(({ cutaway, start }, i) => {
    const next = starts[i + 1]?.start ?? duration;
    const wanted = cutaway.until ? frameOf(cutaway.until) : undefined;
    const end = Math.min(next, duration, wanted !== undefined && wanted > start ? wanted : start + defaultFrames);
    if (end - start >= MIN_CUTAWAY_FRAMES) windows.push({ background: cutaway.background, start, end });
  });
  return windows;
}

/** The cutaway shown at `frame`, if any. */
export function cutawayAt<B extends string>(windows: readonly CutawayWindow<B>[], frame: number): CutawayWindow<B> | undefined {
  return windows.find((w) => frame >= w.start && frame < w.end);
}
