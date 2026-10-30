import type { Metadata } from 'next';
import Link from 'next/link';
import { Fredoka } from 'next/font/google';
import { loadConfig } from '@kantor/shared';
import { ChatMengambang } from '@/components/ChatMengambang';
import { LogoTasnie } from '@/components/LogoTasnie';
import './globals.css';

// font tulisan logo, sama seperti di video
const fredoka = Fredoka({ subsets: ['latin'], weight: ['600', '700'] });

export const metadata: Metadata = {
  title: 'Kantor AI · Tasnie',
  description: 'Kantor AI untuk channel YouTube cerita islami anak',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = loadConfig();
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <Link href="/" aria-label={cfg.namaChannel} style={{ textDecoration: 'none' }}>
            <LogoTasnie keterangan={cfg.namaChannel.replace(/^Tasnie\s*/i, '')} fontJudul={fredoka.style.fontFamily} />
          </Link>
          <nav>
            <Link href="/">Papan Kerja</Link>
            <Link href="/kantor">Kantor 3D</Link>
            <Link href="/jadwal">Jadwal Tayang</Link>
            <Link href="/laporan">Riset & Laporan</Link>
            <Link href="/ide-baru">+ Ide Manual</Link>
            <Link href="/hafalan-baru">+ Hafalan</Link>
            <Link href="/pengaturan">Pengaturan</Link>
          </nav>
        </header>
        <main>{children}</main>
        <ChatMengambang />
      </body>
    </html>
  );
}
