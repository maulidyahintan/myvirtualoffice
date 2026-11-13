// Which sidebar menu groups the owner folded, remembered in the browser. Pure helpers, unit-tested.

export const COLLAPSED_GROUPS_KEY = 'sidebar:collapsed-groups';

/** Group titles stored as JSON; anything unreadable means nothing is folded. */
export function parseCollapsedGroups(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // a value written by an older version or edited by hand: start with every group open
    return [];
  }
}

/** Fold an open group or unfold a folded one. */
export function toggleGroup(collapsed: readonly string[], title: string): string[] {
  return collapsed.includes(title) ? collapsed.filter((t) => t !== title) : [...collapsed, title];
}

/** Sum of the item badges, shown next to a folded group so waiting work is never hidden. */
export function groupBadgeTotal(items: readonly { badge?: number }[]): number {
  return items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
}
