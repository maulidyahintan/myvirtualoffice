import { describe, expect, it } from 'vitest';
import { groupBadgeTotal, parseCollapsedGroups, toggleGroup } from './sidebarState';

describe('parseCollapsedGroups', () => {
  it('reads the stored group titles', () => {
    expect(parseCollapsedGroups('["Produksi","Sistem"]')).toEqual(['Produksi', 'Sistem']);
  });

  it('opens every group when nothing or something unreadable is stored', () => {
    expect(parseCollapsedGroups(null)).toEqual([]);
    expect(parseCollapsedGroups('not json')).toEqual([]);
    expect(parseCollapsedGroups('{"Produksi":true}')).toEqual([]);
    expect(parseCollapsedGroups('["Produksi",3]')).toEqual(['Produksi']);
  });
});

describe('toggleGroup', () => {
  it('folds an open group and unfolds a folded one', () => {
    expect(toggleGroup([], 'Produksi')).toEqual(['Produksi']);
    expect(toggleGroup(['Produksi', 'Sistem'], 'Produksi')).toEqual(['Sistem']);
  });
});

describe('groupBadgeTotal', () => {
  it('adds up the badges of the items', () => {
    expect(groupBadgeTotal([{ badge: 2 }, {}, { badge: 3 }])).toBe(5);
    expect(groupBadgeTotal([])).toBe(0);
  });
});
