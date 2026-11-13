import { describe, expect, it } from 'vitest';
import { forecastText, formatDate, formatDuration, formatNumber, paceText, percentDone } from './monetizationText';

describe('formatNumber', () => {
  it('groups thousands the Indonesian way', () => {
    expect(formatNumber(10_000_000)).toBe('10.000.000');
  });

  it('keeps one decimal for small fractions only', () => {
    expect(formatNumber(0.5)).toBe('0,5');
    expect(formatNumber(12.7)).toBe('13');
  });
});

describe('formatDate and formatDuration', () => {
  it('writes the month in Indonesian', () => {
    expect(formatDate('2027-02-11')).toBe('11 Februari 2027');
  });

  it('switches from days to months to years', () => {
    expect(formatDuration(12)).toBe('12 hari');
    expect(formatDuration(45)).toBe('±1,5 bulan');
    expect(formatDuration(800)).toBe('±2,2 tahun');
  });
});

describe('forecastText', () => {
  it('describes every forecast status', () => {
    expect(forecastText({ status: 'reached' })).toContain('Sudah tercapai');
    expect(forecastText({ status: 'on-pace', days: 90, date: '2027-02-11' })).toBe('±3 bulan lagi (11 Februari 2027)');
    expect(forecastText({ status: 'stalled' })).toContain('belum ada pertumbuhan');
    expect(forecastText({ status: 'unknown' })).toContain('datanya belum cukup');
  });
});

describe('percentDone', () => {
  it('caps at 100 and treats unknown values as 0', () => {
    expect(percentDone({ current: 82, target: 1_000 })).toBe(8);
    expect(percentDone({ current: 5_000, target: 1_000 })).toBe(100);
    expect(percentDone({ current: null, target: 1_000 })).toBe(0);
  });
});

describe('paceText', () => {
  it('compares the needed pace with the current one', () => {
    expect(paceText({ dailyRate: 0.5, neededPerDay: 4.2, unit: 'subscriber' })).toBe('butuh 4,2 subscriber/hari, sekarang 0,5/hari');
  });

  it('shows only the current pace without a goal', () => {
    expect(paceText({ dailyRate: null, neededPerDay: null, unit: 'jam' })).toBe('laju belum diketahui');
  });

  it('says when the requirement is already met', () => {
    expect(paceText({ dailyRate: 1, neededPerDay: 0, unit: 'jam' })).toBe('sudah terpenuhi');
  });
});
