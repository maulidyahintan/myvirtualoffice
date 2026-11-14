// Things the owner should know about, mostly failures (a render, an upload, a post to Facebook): shown as a
// bell with the unread count at the top of the dashboard. Pure list helpers are unit-tested; the store keeps
// them in data/notifications.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { paths } from './store.ts';

export type NotificationKind = 'error' | 'info';

export interface AppNotification {
  id: string;
  time: string;
  kind: NotificationKind;
  title: string;
  message: string;
  /** Page to open, e.g. "/episode/<id>". */
  link?: string;
  read: boolean;
}

/** Only the latest notifications are kept. */
export const MAX_NOTIFICATIONS = 200;
/** The same unread message within this time is one notification, not a pile (a retried job failing again). */
const DUPLICATE_WINDOW_MS = 10 * 60_000;

/** Add a notification at the front, dropping a recent unread twin and the oldest beyond the cap. */
export function withNotification(list: readonly AppNotification[], incoming: AppNotification, max = MAX_NOTIFICATIONS): AppNotification[] {
  const isTwin = (n: AppNotification) =>
    !n.read && n.title === incoming.title && n.message === incoming.message && Math.abs(Date.parse(incoming.time) - Date.parse(n.time)) < DUPLICATE_WINDOW_MS;
  return [incoming, ...list.filter((n) => !isTwin(n))].slice(0, max);
}

/** Mark one notification (or all, without an id) as read. */
export function markedRead(list: readonly AppNotification[], id?: string): AppNotification[] {
  return list.map((n) => (id === undefined || n.id === id ? { ...n, read: true } : n));
}

export function unreadCount(list: readonly AppNotification[]): number {
  return list.filter((n) => !n.read).length;
}

// ---- store: data/notifications.json

const file = () => path.join(paths.data(), 'notifications.json');

export function listNotifications(): AppNotification[] {
  return fs.existsSync(file()) ? (JSON.parse(fs.readFileSync(file(), 'utf8')) as AppNotification[]) : [];
}

function save(list: AppNotification[]) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), `${JSON.stringify(list, null, 2)}\n`);
}

export function notify(entry: { kind?: NotificationKind; title: string; message: string; link?: string }) {
  const incoming: AppNotification = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    kind: entry.kind ?? 'error',
    title: entry.title,
    message: entry.message,
    link: entry.link,
    read: false,
  };
  save(withNotification(listNotifications(), incoming));
}

export function markNotificationsRead(id?: string) {
  save(markedRead(listNotifications(), id));
}
