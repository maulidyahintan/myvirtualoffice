'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export interface MenuItem {
  href: string;
  ikon: string;
  label: string;
  /** angka kecil di kanan (misal pekerjaan yang menunggu) */
  badge?: number;
}

export interface MenuGroup {
  title: string;
  item: MenuItem[];
}

/**
 * Navigasi utama: menu dikelompokkan per fungsi, kartu "Butuh kamu" di atas sebagai fungsi
 * paling utama. Di layar kecil menjadi laci yang dibuka lewat tombol ☰.
 */
export function Sidebar({ logo, grup, butuhKamu }: { logo: ReactNode; grup: MenuGroup[]; butuhKamu: number }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  // tutup laci setiap pindah halaman
  useEffect(() => setBuka(false), [path]);
  const aktif = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

  return (
    <>
      <div className="bilah-hp">
        <Link href="/" className="bilah-hp-logo">
          {logo}
        </Link>
        <button type="button" className="tombol-laci" onClick={() => setBuka((b) => !b)} aria-expanded={buka} aria-label="Buka menu">
          {buka ? '✕' : '☰'}
          {!buka && butuhKamu ? <span className="titik-merah" /> : null}
        </button>
      </div>

      <aside className={`sidebar ${buka ? 'buka' : ''}`}>
        <Link href="/" className="sidebar-logo">
          {logo}
        </Link>

        <Link href="/board" className={`kartu-butuh ${butuhKamu ? 'ada' : ''}`}>
          <span className="kartu-butuh-angka">{butuhKamu}</span>
          <span>
            <b>{butuhKamu ? 'Butuh kamu' : 'Semua beres'}</b>
            <span className="kartu-butuh-ket">{butuhKamu ? 'naskah, rekaman & video menunggu' : 'tidak ada yang menunggu'}</span>
          </span>
        </Link>

        <nav className="sidebar-nav">
          {grup.map((g) => (
            <div key={g.title} className="sidebar-grup">
              <div className="sidebar-judul">{g.title}</div>
              {g.item.map((m) => (
                <Link key={m.href} href={m.href} className={`sidebar-item ${aktif(m.href) ? 'aktif' : ''}`} aria-current={aktif(m.href) ? 'page' : undefined}>
                  <span className="sidebar-ikon" aria-hidden>
                    {m.ikon}
                  </span>
                  <span className="sidebar-label">{m.label}</span>
                  {m.badge ? <span className="sidebar-badge">{m.badge}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {buka ? <div className="laci-latar" onClick={() => setBuka(false)} /> : null}
    </>
  );
}
