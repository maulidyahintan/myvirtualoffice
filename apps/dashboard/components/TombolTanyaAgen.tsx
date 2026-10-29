'use client';

import { bukaChat } from './ChatMengambang';

/** Tombol kecil di halaman episode untuk membuka chat mengambang. */
export function TombolTanyaAgen() {
  return (
    <button type="button" className="sekunder kecil" onClick={() => bukaChat('manajer')}>
      💬 Tanya agen tentang episode ini
    </button>
  );
}
