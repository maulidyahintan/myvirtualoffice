import { shortsCoverageLabel, type ShortsCoverage } from '@kantor/shared';

/** Badge on a long video's card: how many Shorts were clipped from it, or that it still needs cutting. */
export function ShortsCoverageBadge({ coverage }: { coverage: ShortsCoverage }) {
  if (!coverage.applies) return null;
  const done = coverage.clips > 0;
  return (
    <span className={`badge ${done ? 'selesai' : 'tunggu'}`} title={done ? 'Shorts sudah dipotong dari video ini' : 'Belum ada Shorts yang dipotong dari video ini'}>
      {shortsCoverageLabel(coverage)}
    </span>
  );
}
