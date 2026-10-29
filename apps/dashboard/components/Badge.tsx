import { STATUS_LABEL, STATUS_SIBUK, type EpisodeStatus } from '@kantor/shared';

const TUNGGU: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval'];

export function Badge({ status }: { status: EpisodeStatus }) {
  const kelas = STATUS_SIBUK.includes(status)
    ? 'sibuk'
    : TUNGGU.includes(status)
      ? 'tunggu'
      : status === 'error' || status === 'rejected'
        ? 'error'
        : status === 'scheduled' || status === 'published'
          ? 'selesai'
          : '';
  return <span className={`badge ${kelas}`}>{STATUS_LABEL[status]}</span>;
}
