'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@kantor/shared/notifications';
import { markAllNotificationsRead, markNotificationRead } from '@/app/actions';

/** "5 menit lalu" style age of a notification. */
function age(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * The bar at the top of the dashboard: a banner while there are unread problems and a bell with the unread
 * count. Both open a list of notifications; opening one marks it read and goes to its page.
 */
export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read);
  const now = Date.now();

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const openNotification = (n: AppNotification) => {
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      setOpen(false);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  };

  return (
    <>
      <div className="notif-bar">
        {unread.length ? (
          <button type="button" className="notif-banner" onClick={() => setOpen(true)}>
            ⚠️ {unread.length} {unread.length === 1 ? 'masalah' : 'masalah'} perlu dilihat: <b>{unread[0].title}</b>
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="notif-bell" onClick={() => setOpen(true)} aria-label={`Notifikasi, ${unread.length} belum dibaca`}>
          🔔{unread.length ? <span className="notif-count">{unread.length > 99 ? '99+' : unread.length}</span> : null}
        </button>
      </div>
      {open ? (
        <div className="notif-overlay" role="presentation" onClick={() => setOpen(false)}>
          <div className="notif-modal panel" role="dialog" aria-modal="true" aria-label="Notifikasi" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <h2 style={{ margin: 0 }}>🔔 Notifikasi</h2>
              <div className="row" style={{ gap: 8 }}>
                {unread.length ? (
                  <button
                    type="button"
                    className="sekunder"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      await markAllNotificationsRead();
                      router.refresh();
                    })}
                  >
                    Tandai semua dibaca
                  </button>
                ) : null}
                <button type="button" className="sekunder" onClick={() => setOpen(false)} aria-label="Tutup">
                  ✕
                </button>
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className="muted">Belum ada notifikasi.</p>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button type="button" className={`notif-item${n.read ? '' : ' belum'}`} disabled={pending} onClick={() => openNotification(n)}>
                      <span className="notif-icon">{n.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
                      <span className="notif-text">
                        <b>{n.title}</b>
                        <span className="kecil">{n.message}</span>
                        <span className="kecil muted">{age(n.time, now)}{n.read ? ' · dibaca' : ''}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
