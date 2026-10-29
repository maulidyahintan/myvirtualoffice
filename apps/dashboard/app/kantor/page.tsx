import { KantorView } from '@/components/kantor/KantorView';
import { statusKantor } from '@/lib/statusKantor';

export const dynamic = 'force-dynamic';

export default function HalamanKantor() {
  return (
    <div className="stack">
      <div>
        <h1>Kantor</h1>
        <div className="muted">Lihat siapa yang sedang bekerja. Status diperbarui otomatis tiap 3 detik.</div>
      </div>
      <KantorView awal={statusKantor()} />
    </div>
  );
}
