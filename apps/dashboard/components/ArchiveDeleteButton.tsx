'use client';

import { useState, type ReactNode } from 'react';
import { deleteArchivedEpisode } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

/** Ikon tempat sampah bergaris merah. */
function IkonSampah() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l1 12.5h9l1-12.5" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

/**
 * Baris status kartu Arsip: label status (children) + ikon hapus di sebelahnya. Klik ikon memunculkan
 * konfirmasi di dalam kartu (tanpa dialog browser); baru "Ya, hapus" yang benar-benar menghapus. Kalau
 * episode tidak boleh dihapus, ikonnya redup dengan alasannya.
 */
export function ArchiveDeleteButton({
  id,
  title,
  blocked,
  back,
  children,
}: {
  id: string;
  title: string;
  blocked?: string;
  back: string;
  children: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="baris-arsip">
      <div className="baris-arsip-status">
        {children}
        <button
          type="button"
          className={`hapus-kartu ${blocked ? 'redup' : ''}`}
          disabled={Boolean(blocked)}
          onClick={() => setConfirming((c) => !c)}
          title={blocked ? `Tidak bisa dihapus: ${blocked}` : 'Hapus episode ini permanen'}
          aria-label={blocked ? 'Tidak bisa dihapus' : `Hapus ${title}`}
          aria-expanded={confirming}
        >
          <IkonSampah />
        </button>
      </div>
      {confirming && !blocked ? (
        <form action={deleteArchivedEpisode} className="hapus-konfirmasi">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="yakin" value="on" />
          <input type="hidden" name="kembali" value={back} />
          <span>Hapus permanen? Tidak bisa dibatalkan.</span>
          <div className="row" style={{ gap: 6 }}>
            <SubmitButton type="submit" className="bahaya" teksProses="Menghapus…">
              Ya, hapus
            </SubmitButton>
            <button type="button" className="sekunder" onClick={() => setConfirming(false)}>
              Batal
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
