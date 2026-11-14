import { publishedPlatforms, type Episode } from '@kantor/shared';

const ICON_SIZE = 16;

const YouTubeIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" aria-hidden>
    <rect x={1} y={4} width={22} height={16} rx={5} fill="#FF0000" />
    <path d="M10 8.5 L16 12 L10 15.5 Z" fill="#FFFFFF" />
  </svg>
);

const FacebookIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" aria-hidden>
    <circle cx={12} cy={12} r={11} fill="#1877F2" />
    <path d="M13.2 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V5.9c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.7h-2V13h2v6Z" fill="#FFFFFF" />
  </svg>
);

/**
 * Small YouTube and Facebook icons for an episode: in colour where it is uploaded, faded where it is not yet,
 * with a tooltip saying which.
 */
export function PlatformIcons({ ep }: { ep: Pick<Episode, 'youtube' | 'facebook'> }) {
  const on = publishedPlatforms(ep);
  return (
    <span className="platform-icons">
      <span className={on.youtube ? '' : 'belum'} title={on.youtube ? 'Sudah di YouTube' : 'Belum di YouTube'}>
        <YouTubeIcon />
      </span>
      <span className={on.facebook ? '' : 'belum'} title={on.facebook ? 'Sudah di Facebook' : 'Belum di Facebook'}>
        <FacebookIcon />
      </span>
    </span>
  );
}
