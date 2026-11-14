import Link from 'next/link';
import {
  ACTION_REQUEST_STATUS_LABEL,
  getEpisode,
  isBusy,
  listActionRequests,
  speakerNames,
  loadConfig,
  type ActionRequest,
  type ActionRequestStatus,
} from '@kantor/shared';
import { approveAction, buildAction, rejectAction, applyNewAction } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SubmitButton } from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

const BADGE: Record<ActionRequestStatus, string> = {
  requested: 'tunggu',
  building: 'tunggu',
  ready: 'selesai',
  approved: 'selesai',
  rejected: '',
  failed: 'error',
};

function episodeTitle(id: string): string {
  try {
    const ep = getEpisode(id);
    return ep.script?.title ?? ep.idea.title;
  } catch {
    // the episode was deleted after it asked for the action
    return id;
  }
}

const NamedForm: React.FC<{ action: (form: FormData) => Promise<void>; name: string; children: React.ReactNode }> = ({ action, name, children }) => (
  <form action={action}>
    <input type="hidden" name="nama" value={name} />
    {children}
  </form>
);

function RequestActions({ request, busy }: { request: ActionRequest; busy: boolean }) {
  if (busy || request.status === 'building') {
    return (
      <div className="row kecil sedang-diperbaiki" role="status" style={{ gap: 8 }}>
        <span className="putar" aria-hidden />
        <span>{request.note ?? 'Sedang dikerjakan…'}</span>
      </div>
    );
  }
  if (request.status === 'requested' || request.status === 'failed') {
    return (
      <div className="row" style={{ gap: 8 }}>
        <NamedForm action={buildAction} name={request.name}>
          <SubmitButton teksProses="Memulai…">🛠️ {request.status === 'failed' ? 'Coba buat lagi' : 'Buat sekarang'}</SubmitButton>
        </NamedForm>
        <NamedForm action={rejectAction} name={request.name}>
          <SubmitButton className="sekunder" teksProses="…">Tidak perlu</SubmitButton>
        </NamedForm>
      </div>
    );
  }
  if (request.status === 'ready') {
    return (
      <div className="row" style={{ gap: 8 }}>
        <NamedForm action={approveAction} name={request.name}>
          <SubmitButton teksProses="Menggabungkan…">✅ Setujui &amp; pakai</SubmitButton>
        </NamedForm>
        <NamedForm action={rejectAction} name={request.name}>
          <SubmitButton className="sekunder" teksProses="…">❌ Tolak</SubmitButton>
        </NamedForm>
      </div>
    );
  }
  return null;
}

function RequestCard({ request }: { request: ActionRequest }) {
  const names = speakerNames(loadConfig());
  const busy = isBusy(`aksi-${request.name}`);
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ margin: 0 }}>
          <code>{request.name}</code>
        </h2>
        <span className={`badge ${BADGE[request.status]}`}>{ACTION_REQUEST_STATUS_LABEL[request.status]}</span>
      </div>
      <p style={{ margin: 0 }}>{request.description}</p>
      <div className="kecil muted">Tokoh: {request.characters.map((c) => names[c as keyof typeof names] ?? c).join(', ')}</div>
      {request.note && request.status !== 'building' ? (
        <p className={`kecil ${request.status === 'failed' ? 'peringatan' : 'muted'}`} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {request.note}
        </p>
      ) : null}
      {request.sample && request.status === 'ready' ? (
        <video controls preload="metadata" src={`/api/media/${request.sample}?v=${request.updated}`} style={{ width: '100%', maxWidth: 520, borderRadius: 8 }} />
      ) : null}
      <RequestActions request={request} busy={busy} />
      <div className="kecil stack" style={{ gap: 4 }}>
        {request.scenes.map((ref) => (
          <div key={`${ref.episodeId}-${ref.scene}`} className="row" style={{ gap: 8 }}>
            <span>
              Dibutuhkan di <Link href={`/episode/${ref.episodeId}`}>{episodeTitle(ref.episodeId)}</Link> · adegan {ref.scene}
            </span>
            {request.status === 'approved' ? (
              <form action={applyNewAction}>
                <input type="hidden" name="nama" value={request.name} />
                <input type="hidden" name="id" value={ref.episodeId} />
                <input type="hidden" name="adegan" value={ref.scene} />
                <SubmitButton className="sekunder" teksProses="Mengirim…">
                  🎬 Pakai di adegan {ref.scene}
                </SubmitButton>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewActionsPage() {
  const requests = listActionRequests();
  const running = requests.some((r) => r.status === 'building' || isBusy(`aksi-${r.name}`));
  const open = requests.filter((r) => r.status !== 'rejected');
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>🧩 Aksi Baru</h1>
          <div className="muted">
            Gerakan yang dibutuhkan cerita tapi belum ada, diminta oleh Sutradara. Pembuat Aksi menulisnya di salinan proyek terpisah, lalu
            typecheck dan test harus lolos dan klip contoh dirender. Aksi baru masuk ke proyek hanya setelah kamu setujui.
          </div>
        </div>
        <AutoRefresh aktif={running} detik={8} />
      </div>
      {open.length === 0 ? (
        <div className="panel muted">Belum ada permintaan aksi baru. Sutradara menambahkannya ke sini saat sebuah adegan butuh gerakan yang belum ada.</div>
      ) : (
        open.map((request) => <RequestCard key={request.name} request={request} />)
      )}
    </div>
  );
}
