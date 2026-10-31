'use client';

import { openChat } from './FloatingChat';

/** SubmitButton kecil di halaman episode untuk membuka chat mengambang. */
export function AskAgentButton() {
  return (
    <button type="button" className="sekunder kecil" onClick={() => openChat('manajer')}>
      💬 Tanya agen tentang episode ini
    </button>
  );
}
