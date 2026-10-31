import { STATUS_LABEL, BUSY_STATUSES, type EpisodeStatus } from '@kantor/shared';

const WAITING: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval'];

export function Badge({ status }: { status: EpisodeStatus }) {
  const kelas = BUSY_STATUSES.includes(status)
    ? 'sibuk'
    : WAITING.includes(status)
      ? 'tunggu'
      : status === 'error' || status === 'rejected'
        ? 'error'
        : status === 'scheduled' || status === 'published'
          ? 'selesai'
          : '';
  return <span className={`badge ${kelas}`}>{STATUS_LABEL[status]}</span>;
}
