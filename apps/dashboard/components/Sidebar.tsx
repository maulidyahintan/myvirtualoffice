'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { COLLAPSED_GROUPS_KEY, groupBadgeTotal, parseCollapsedGroups, toggleGroup } from '@/lib/sidebarState';

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

/** Remembered folded groups; storage can be unavailable (private mode), then nothing is remembered. */
function useCollapsedGroups(): [string[], (title: string) => void] {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setCollapsed(parseCollapsedGroups(localStorage.getItem(COLLAPSED_GROUPS_KEY)));
    } catch {
      // storage blocked: every group stays open
    }
  }, []);
  const toggle = (title: string) =>
    setCollapsed((current) => {
      const next = toggleGroup(current, title);
      try {
        localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the choice lasts until the page reloads
      }
      return next;
    });
  return [collapsed, toggle];
}

/** One menu group whose items can be folded away with the arrow next to its title. */
function MenuGroupSection({ group, collapsed, onToggle, isActive }: { group: MenuGroup; collapsed: boolean; onToggle: () => void; isActive: (href: string) => boolean }) {
  const listId = `menu-${group.title.toLowerCase().replace(/\W+/g, '-')}`;
  const hiddenBadges = collapsed ? groupBadgeTotal(group.item) : 0;
  return (
    <div className="sidebar-grup">
      <button type="button" className="sidebar-judul" onClick={onToggle} aria-expanded={!collapsed} aria-controls={listId}>
        <span>{group.title}</span>
        {hiddenBadges ? <span className="sidebar-badge kecil">{hiddenBadges}</span> : null}
        <span className="sidebar-panah" aria-hidden>
          {collapsed ? '▾' : '▴'}
        </span>
      </button>
      <div id={listId} className="sidebar-grup-isi" hidden={collapsed}>
        {group.item.map((m) => (
          <Link key={m.href} href={m.href} className={`sidebar-item ${isActive(m.href) ? 'aktif' : ''}`} aria-current={isActive(m.href) ? 'page' : undefined}>
            <span className="sidebar-ikon" aria-hidden>
              {m.ikon}
            </span>
            <span className="sidebar-label">{m.label}</span>
            {m.badge ? <span className="sidebar-badge">{m.badge}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
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
  const [collapsed, toggle] = useCollapsedGroups();

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
        {/* logo & "Butuh kamu" stay in place; only the menu below scrolls */}
        <div className="sidebar-atas">
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
        </div>

        <nav className="sidebar-nav">
          {grup.map((g) => (
            <MenuGroupSection key={g.title} group={g} collapsed={collapsed.includes(g.title)} onToggle={() => toggle(g.title)} isActive={aktif} />
          ))}
        </nav>
      </aside>
      {buka ? <div className="laci-latar" onClick={() => setBuka(false)} /> : null}
    </>
  );
}
