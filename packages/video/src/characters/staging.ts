// Who does what to whom in a scene with touching characters, decided from the scene's actions. Pure, tested.
import type { Action, Character, CharacterAction, Scene } from '@kantor/shared/types';

const CHILDREN: readonly Character[] = ['mamas', 'friend'];
/** Actions a child does sitting on the bed when the room has one. */
const BED_ACTIONS: readonly Action[] = ['hugging-knees', 'hiding-under-blanket'];

export interface Staging {
  /** Child sitting on the bed hugging its knees or hiding under the blanket (bedrooms in standard videos). */
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

  const sitsOnBed = (id: Character) => {
    const action = actionOf(id);
    return action !== undefined && BED_ACTIONS.includes(action);
  };
  const sitterOnBed = options.hasBed ? children.find(sitsOnBed) : undefined;
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

/** Mochi actions that take it out of the row of standing characters (on the bed, around legs, walking). */
const MOCHI_OFF_ROW: readonly Action[] = ['sleeping', 'falling', 'circling', 'approaching', 'licking'];

/**
 * Characters standing in the row when the scene starts. A scene whose actions change keeps everyone at
 * these spots, so nobody jumps sideways when someone else leaves the row (dives onto the bed, walks off).
 */
export function rowAtStart(characters: readonly Character[], startActions: readonly CharacterAction[], options: { hasBed: boolean }): Character[] {
  const actionOf = (id: Character) => startActions.find((a) => a.character === id)?.action;
  return characters.filter((id) => {
    const action = actionOf(id);
    if (id === 'mochi') return !action || !MOCHI_OFF_ROW.includes(action);
    return !(options.hasBed && action && BED_ACTIONS.includes(action));
  });
}
