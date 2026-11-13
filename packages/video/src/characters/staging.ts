// Who does what to whom in a scene with touching characters, decided from the scene's actions. Pure, tested.
import type { Action, Character, Scene } from '@kantor/shared/types';

const CHILDREN: readonly Character[] = ['mamas', 'friend'];

export interface Staging {
  /** Child sitting on the bed hugging its knees (bedrooms in standard videos). */
  sitterOnBed?: Character;
  /** Child holding Mochi in its arms, and whether Mochi licks its cheek. */
  carrier?: Character;
  carriedCat?: 'calm' | 'licking';
  /** Character Mochi walks up to. */
  approachTarget?: Character;
  /** Child Mother hugs at her side. */
  hugged?: Character;
}

export function stageInteractions(scene: Pick<Scene, 'characters' | 'actions'>, options: { hasBed: boolean }): Staging {
  const present = (id: Character) => scene.characters.includes(id);
  const actionOf = (id: Character): Action | undefined => (present(id) ? scene.actions?.find((a) => a.character === id)?.action : undefined);
  const children = CHILDREN.filter(present);
  const mochiAction = actionOf('mochi');

  const sitterOnBed = options.hasBed ? children.find((id) => actionOf(id) === 'hugging-knees') : undefined;
  // a licking Mochi needs someone to hold it: the child told to carry it, else the first child in the scene
  const carrier = children.find((id) => actionOf(id) === 'carrying-cat') ?? (mochiAction === 'licking' ? children[0] : undefined);
  const approachTarget = mochiAction === 'approaching' ? (sitterOnBed ?? children[0] ?? (present('mother') ? 'mother' : undefined)) : undefined;
  const hugged = actionOf('mother') === 'hugging' ? children.find((id) => id !== sitterOnBed && id !== carrier) ?? children.find((id) => id !== sitterOnBed) : undefined;

  return {
    sitterOnBed,
    carrier,
    carriedCat: carrier ? (mochiAction === 'licking' ? 'licking' : 'calm') : undefined,
    approachTarget,
    hugged,
  };
}

/** Mochi leaves the row of standing characters when it is carried or walks up to someone. */
export function mochiLeavesRow(staging: Staging): boolean {
  return Boolean(staging.carrier || staging.approachTarget);
}

/**
 * Order to draw `count` characters so that `front` comes right after `behind` (e.g. the child Mother hugs
 * is drawn over her body, then her arm over the child). Without a pair the row keeps its order.
 */
export function drawOrder(count: number, behind: number, front: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  if (behind < 0 || front < 0 || behind === front) return order;
  const rest = order.filter((i) => i !== front);
  rest.splice(rest.indexOf(behind) + 1, 0, front);
  return rest;
}
