import type { Metadata } from 'next';
import Link from 'next/link';
import { loadConfig } from '@kantor/shared';
import { ChatMengambang } from '@/components/ChatMengambang';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kantor AI',
  description: 'Kantor AI untuk channel YouTube cerita islami anak',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = loadConfig();
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <span className="logo">🏢 {cfg.namaChannel}</span>
          <nav>
            <Link href="/">Papan Kerja</Link>
            <Link href="/kantor">Kantor 3D</Link>
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
