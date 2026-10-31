import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import { listEpisodes, loadConfig, type EpisodeStatus } from '@kantor/shared';
import { FloatingChat } from '@/components/FloatingChat';
import { TasnieLogo } from '@/components/TasnieLogo';
import { Sidebar, type MenuGroup } from '@/components/Sidebar';
import './globals.css';

// font tulisan logo (sama seperti di video)
const fredoka = Fredoka({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-judul' });

// font profesional untuk UI (dibuat di Indonesia, sangat mudah dibaca)
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-ui' });

export const metadata: Metadata = {
  title: 'Kantor AI · Tasnie',
  description: 'Kantor AI untuk channel YouTube cerita islami anak',
};

export const dynamic = 'force-dynamic';

/** Status yang menunggu tindakan pemilik channel. */
const WAITING_STATUSES: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = loadConfig();
  const episodes = listEpisodes();
  const butuhKamu = episodes.filter((e) => WAITING_STATUSES.includes(e.status)).length;
  const siapTayang = episodes.filter((e) => e.status === 'needs_video_approval').length;

  const grup: MenuGroup[] = [
    { title: 'Beranda', item: [{ href: '/', ikon: '🏢', label: 'Kantor' }] },
    {
      title: 'Produksi',
      item: [
        { href: '/board', ikon: '🗂️', label: 'Papan Kerja', badge: butuhKamu },
        { href: '/ideas/new', ikon: '💡', label: 'Ide Manual' },
        { href: '/memorization/new', ikon: '📖', label: 'Hafalan Baru' },
      ],
    },
    {
      title: 'Publikasi',
      item: [
        { href: '/schedule', ikon: '📅', label: 'Jadwal Tayang', badge: siapTayang },
        { href: '/published', ikon: '🎬', label: 'Video Tayang' },
      ],
    },
    { title: 'Analisis', item: [{ href: '/reports', ikon: '📊', label: 'Riset & Laporan' }] },
    { title: 'Sistem', item: [{ href: '/settings', ikon: '⚙️', label: 'Pengaturan' }] },
  ];

  return (
    <html lang="id" className={`${fredoka.variable} ${plusJakartaSans.variable}`}>
      <body>
        <div className="aplikasi">
          <Sidebar
            logo={<TasnieLogo keterangan={cfg.channelName.replace(/^Tasnie\s*/i, '')} fontJudul={fredoka.style.fontFamily} />}
            grup={grup}
            butuhKamu={butuhKamu}
          />
          <main>{children}</main>
        </div>
        <FloatingChat />
      </body>
    </html>
  );
}
