import type { Metadata } from 'next';
import { Fredoka } from 'next/font/google';
import { listEpisodes, loadConfig, type EpisodeStatus } from '@kantor/shared';
import { ChatMengambang } from '@/components/ChatMengambang';
import { LogoTasnie } from '@/components/LogoTasnie';
import { Sidebar, type GrupMenu } from '@/components/Sidebar';
import './globals.css';

// font tulisan logo & judul halaman, sama seperti di video
const fredoka = Fredoka({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-judul' });

export const metadata: Metadata = {
  title: 'Kantor AI · Tasnie',
  description: 'Kantor AI untuk channel YouTube cerita islami anak',
};

export const dynamic = 'force-dynamic';

/** Status yang menunggu tindakan pemilik channel. */
const MENUNGGU: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = loadConfig();
  const episodes = listEpisodes();
  const butuhKamu = episodes.filter((e) => MENUNGGU.includes(e.status)).length;
  const siapTayang = episodes.filter((e) => e.status === 'needs_video_approval').length;

  const grup: GrupMenu[] = [
    { judul: 'Beranda', item: [{ href: '/', ikon: '🏢', label: 'Kantor' }] },
    {
      judul: 'Produksi',
      item: [
        { href: '/papan-kerja', ikon: '🗂️', label: 'Papan Kerja', badge: butuhKamu },
        { href: '/ide-baru', ikon: '💡', label: 'Ide Manual' },
        { href: '/hafalan-baru', ikon: '📖', label: 'Hafalan Baru' },
      ],
    },
    {
      judul: 'Publikasi',
      item: [
        { href: '/jadwal', ikon: '📅', label: 'Jadwal Tayang', badge: siapTayang },
        { href: '/tayang', ikon: '🎬', label: 'Video Tayang' },
      ],
    },
    { judul: 'Analisis', item: [{ href: '/laporan', ikon: '📊', label: 'Riset & Laporan' }] },
    { judul: 'Sistem', item: [{ href: '/pengaturan', ikon: '⚙️', label: 'Pengaturan' }] },
  ];

  return (
    <html lang="id" className={fredoka.variable}>
      <body>
        <div className="aplikasi">
          <Sidebar
            logo={<LogoTasnie keterangan={cfg.namaChannel.replace(/^Tasnie\s*/i, '')} fontJudul={fredoka.style.fontFamily} />}
            grup={grup}
            butuhKamu={butuhKamu}
          />
          <main>{children}</main>
        </div>
        <ChatMengambang />
      </body>
    </html>
  );
}
