'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Panel yang bisa dibuka-tutup (▾/▴). Saat tertutup judulnya tetap menampilkan ringkasan nilai.
 * Status buka/tutup diingat per panel di browser ini (localStorage).
 */
export function BagianLipat({
  id,
  judul,
  ringkasan,
  bawaanBuka = false,
  ingat = true,
  children,
}: {
  id: string;
  judul: ReactNode;
  ringkasan?: ReactNode;
  bawaanBuka?: boolean;
  /** false = selalu mulai dari `bawaanBuka` (tidak memakai status tersimpan) */
  ingat?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const kunci = `lipat:${id}`;

  useEffect(() => {
    if (!ingat) return;
    try {
      const simpan = localStorage.getItem(kunci);
      if (simpan !== null && ref.current) ref.current.open = simpan === '1';
    } catch {
      /* localStorage tidak tersedia */
    }
  }, [kunci, ingat]);

  return (
    <details
      ref={ref}
      className="panel bagian-lipat"
      open={bawaanBuka || undefined}
      onToggle={(e) => {
        if (!ingat) return;
        try {
          localStorage.setItem(kunci, (e.currentTarget as HTMLDetailsElement).open ? '1' : '0');
        } catch {
          /* abaikan */
        }
      }}
    >
      <summary>
        <span className="bagian-judul">{judul}</span>
        {ringkasan ? <span className="bagian-ringkas">{ringkasan}</span> : null}
        <span className="bagian-panah" aria-hidden />
      </summary>
      <div className="bagian-isi stack">{children}</div>
    </details>
  );
}
