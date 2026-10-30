'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { useFormStatus } from 'react-dom';

/** Loading tampil minimal selama ini supaya aksi yang sangat cepat tetap terlihat. */
const MIN_PROSES_MS = 500;
/** Lama tanda "✓ selesai" setelah aksi berhasil. */
const SELESAI_MS = 2000;

/**
 * Tombol kirim form yang memberi tanda sedang diproses: tombol yang diklik menampilkan putaran
 * loading + teks proses, semua tombol di form yang sama dikunci sampai aksi selesai, lalu
 * tombol yang diklik menampilkan "✓ Tersimpan"/"✓ Selesai" sebentar.
 * Bekerja untuk server action (useFormStatus) maupun form biasa yang pindah halaman (upload).
 */
export function Tombol({
  children,
  teksProses = 'Memproses…',
  teksSelesai,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { teksProses?: string; teksSelesai?: string }) {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  const [tahap, setTahap] = useState<'diam' | 'proses' | 'selesai'>('diam');
  const mulai = useRef(0);
  const pernahPending = useRef(false);

  const timer = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hentikanTimer = () => {
    timer.current.forEach(clearTimeout);
    timer.current = [];
  };
  useEffect(() => hentikanTimer, []);

  // catat tombol mana yang mengirim form (form bisa punya beberapa tombol)
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const kirim = (e: SubmitEvent) => {
      if (e.submitter !== ref.current || e.defaultPrevented) return;
      hentikanTimer();
      mulai.current = Date.now();
      setTahap('proses');
    };
    form.addEventListener('submit', kirim);
    return () => form.removeEventListener('submit', kirim);
  }, []);

  // server action selesai → "✓ selesai" sebentar, lalu normal (form biasa pindah halaman, jadi tidak perlu).
  // Timer tidak dibatalkan oleh render ulang halaman setelah revalidasi, hanya oleh klik baru / unmount.
  useEffect(() => {
    if (pending) {
      pernahPending.current = true;
      return;
    }
    if (!pernahPending.current) return;
    pernahPending.current = false;
    const sisa = Math.max(0, MIN_PROSES_MS - (Date.now() - mulai.current));
    timer.current.push(
      setTimeout(() => setTahap((t) => (t === 'proses' ? 'selesai' : t)), sisa),
      setTimeout(() => setTahap((t) => (t === 'selesai' ? 'diam' : t)), sisa + SELESAI_MS),
    );
  }, [pending]);

  const proses = tahap === 'proses';
  const selesai = teksSelesai ?? (/menyimpan/i.test(teksProses) ? '✓ Tersimpan' : '✓ Selesai');
  return (
    <button
      ref={ref}
      type="submit"
      {...props}
      disabled={disabled || pending || proses}
      aria-busy={proses || undefined}
      data-proses={proses || undefined}
      data-selesai={tahap === 'selesai' || undefined}
    >
      {proses ? (
        <>
          <span className="putar" aria-hidden />
          {teksProses}
        </>
      ) : tahap === 'selesai' ? (
        selesai
      ) : (
        children
      )}
    </button>
  );
}
