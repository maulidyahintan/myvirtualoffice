// Indonesian wording for the monetization page. Pure functions, unit-tested.
import type { Forecast, RequirementProgress } from '@kantor/shared';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** 1234567 → "1.234.567"; decimals only for small numbers (2,5). */
export function formatNumber(value: number): string {
  const digits = Math.abs(value) < 10 && !Number.isInteger(value) ? 1 : 0;
  return value.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** "2027-02-11" → "11 Februari 2027". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** 45 → "±1,5 bulan", 800 → "±2,2 tahun". */
export function formatDuration(days: number): string {
  if (days < DAYS_PER_MONTH) return `${days} hari`;
  if (days < DAYS_PER_YEAR) return `±${formatNumber(Math.round((days / DAYS_PER_MONTH) * 10) / 10)} bulan`;
  return `±${formatNumber(Math.round((days / DAYS_PER_YEAR) * 10) / 10)} tahun`;
}

/** Short sentence for a forecast, e.g. "± 3 bulan lagi (11 Februari 2027)". */
export function forecastText(f: Forecast): string {
  switch (f.status) {
    case 'reached':
      return 'Sudah tercapai 🎉';
    case 'on-pace':
      return `${formatDuration(f.days)} lagi (${formatDate(f.date)})`;
    case 'stalled':
      return 'Belum bisa diperkirakan: belum ada pertumbuhan';
    default:
      return 'Belum bisa diperkirakan: datanya belum cukup';
  }
}

/** Share of the target reached, 0–100. */
export function percentDone(r: Pick<RequirementProgress, 'current' | 'target'>): number {
  if (r.current === null || r.target <= 0) return 0;
  return Math.min(100, Math.round((r.current / r.target) * 100));
}

/** "butuh 12 subscriber/hari, sekarang 0,5/hari" for a requirement with a goal. */
export function paceText(r: Pick<RequirementProgress, 'dailyRate' | 'neededPerDay' | 'unit'>): string {
  const now = r.dailyRate === null ? 'laju belum diketahui' : `sekarang ${formatNumber(r.dailyRate)}/hari`;
  if (r.neededPerDay === null) return now;
  if (r.neededPerDay === 0) return 'sudah terpenuhi';
  return `butuh ${formatNumber(r.neededPerDay)} ${r.unit}/hari, ${now}`;
}
