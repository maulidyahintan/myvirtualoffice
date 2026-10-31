import { loadConfig } from '@kantor/shared';
import { OfficeView } from '@/components/office/OfficeView';
import { officeStatus } from '@/lib/officeStatus';

export const dynamic = 'force-dynamic';

export default function HalamanKantor() {
  const cfg = loadConfig();
  return (
    <div className="stack">
      <div>
        <h1>Kantor {cfg.channelName}</h1>
        <div className="muted">Lihat siapa yang sedang bekerja. Status diperbarui otomatis tiap 3 detik.</div>
      </div>
      <OfficeView awal={officeStatus()} />
    </div>
  );
}
