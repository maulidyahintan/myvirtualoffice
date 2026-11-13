import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, BACKGROUND_LABEL } from './constants.ts';

describe('backgrounds', () => {
  it('include the stormy bedroom and the stormy night', () => {
    expect(BACKGROUNDS).toContain('bedroom-storm');
    expect(BACKGROUNDS).toContain('night-storm');
  });

  it('all have an Indonesian label for the owner', () => {
    for (const background of BACKGROUNDS) expect(BACKGROUND_LABEL[background]?.trim()).toBeTruthy();
  });
});

describe('school backgrounds', () => {
  it('cover arriving, the yard and the canteen besides the classroom', () => {
    for (const background of ['school', 'school-gate', 'school-yard', 'school-canteen'] as const) expect(BACKGROUNDS).toContain(background);
  });
});

describe('house front', () => {
  it('is a background with an Indonesian label', () => {
    expect(BACKGROUNDS).toContain('house-front');
    expect(BACKGROUND_LABEL['house-front']).toContain('pintu');
  });
});
