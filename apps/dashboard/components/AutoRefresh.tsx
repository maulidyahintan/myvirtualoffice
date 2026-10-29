'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Refresh halaman tiap beberapa detik selama ada agen yang bekerja. */
export function AutoRefresh({ aktif, detik = 4 }: { aktif: boolean; detik?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!aktif) return;
    const t = setInterval(() => router.refresh(), detik * 1000);
    return () => clearInterval(t);
  }, [aktif, detik, router]);
  return aktif ? <span className="pulse">● agen sedang bekerja</span> : null;
}
