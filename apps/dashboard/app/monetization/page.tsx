import { isBusy, loadConfig, metricsHistory, monetizationOverview, type PlatformProgress, type RequirementProgress } from '@kantor/shared';
import { refreshMetrics, saveMonetizationGoals } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SubmitButton } from '@/components/SubmitButton';
import { forecastText, formatDate, formatNumber, paceText, percentDone } from '@/lib/monetizationText';

export const dynamic = 'force-dynamic';

const PLATFORM_NOTES = {
  youtube:
    'Syarat YouTube Partner Program untuk pendapatan iklan: 1.000 subscriber, ditambah 4.000 jam tonton video panjang publik dalam 12 bulan atau 10 juta views Shorts dalam 90 hari. Channel “Made for Kids” tetap bisa mendapat iklan (non-personal), tapi tanpa membership, Super Thanks, dan komentar.',
  facebook:
    'Syarat Monetisasi Konten Facebook berbeda per negara dan sering berubah. Angka di sini adalah yang umum dilaporkan (5.000 pengikut, 60.000 menit ditonton dalam 60 hari, 5 video aktif). Angka pasti untuk Page Anda ada di Dasbor Profesional → Monetisasi.',
} as const;

function RequirementRow({ requirement }: { requirement: RequirementProgress }) {
  const percent = percentDone(requirement);
  const current = requirement.current === null ? '—' : formatNumber(requirement.current);
  return (
    <div className="requirement">
      <div className="requirement-head kecil">
        <b>{requirement.label}</b>
        <span>
          {current} / {formatNumber(requirement.target)} {requirement.unit} ({percent}%)
        </span>
      </div>
      <div className="progress" aria-label={`${requirement.label} ${percent}%`}>
        <div className={`progress-fill${percent >= 100 ? ' done' : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="kecil muted">
        {forecastText(requirement.forecast)} · {paceText(requirement)}
      </div>
    </div>
  );
}

function GoalBadge({ progress }: { progress: PlatformProgress }) {
  if (!progress.goal) return <span className="badge">Belum ada target tanggal</span>;
  const label = `Target ${formatDate(progress.goal)}`;
  if (progress.onTrack === true) return <span className="badge selesai">✅ {label}: sesuai jalur</span>;
  if (progress.onTrack === false) return <span className="badge error">⚠️ {label}: perlu dipercepat</span>;
  return <span className="badge tunggu">{label}: data belum cukup</span>;
}

function PlatformCard({ title, progress, error, note }: { title: string; progress?: PlatformProgress; error?: string; note: string }) {
  return (
    <div className="panel stack">
      <h2>{title}</h2>
      {progress ? (
        <>
          <div className="platform-forecast">Monetisasi: {forecastText(progress.forecast)}</div>
          <GoalBadge progress={progress} />
          {progress.paths.map((path) => (
            <div key={path.label} className="stack" style={{ gap: 10 }}>
              <div className="kecil">
                <b>{path.label}</b> <span className="muted">· {forecastText(path.forecast)}</span>
              </div>
              {path.requirements.map((r) => (
                <RequirementRow key={r.key} requirement={r} />
              ))}
            </div>
          ))}
        </>
      ) : (
        <p className="peringatan kecil">{error ?? 'Belum ada data. Klik “Perbarui data”.'}</p>
      )}
      <p className="kecil muted" style={{ margin: 0 }}>
        {note}
      </p>
    </div>
  );
}

function GoalForm({ goals }: { goals?: { youtube?: string; facebook?: string } }) {
  return (
    <form action={saveMonetizationGoals} className="panel stack">
      <h2>🎯 Target tanggal monetisasi</h2>
      <p className="kecil muted" style={{ margin: 0 }}>
        Isi kapan Anda ingin tiap platform bisa dimonetisasi. Halaman ini lalu menghitung berapa pertumbuhan per hari yang dibutuhkan dan
        apakah laju sekarang sudah cukup. Channel Manager juga memakainya di laporan.
      </p>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <label className="kecil">
          YouTube
          <input type="date" name="youtube" defaultValue={goals?.youtube ?? ''} />
        </label>
        <label className="kecil">
          Facebook
          <input type="date" name="facebook" defaultValue={goals?.facebook ?? ''} />
        </label>
      </div>
      <div>
        <SubmitButton className="sekunder" teksProses="Menyimpan…">
          Simpan target
        </SubmitButton>
      </div>
    </form>
  );
}

export default function MonetizationPage() {
  const cfg = loadConfig();
  const history = metricsHistory();
  const { snapshot, youtube, facebook } = monetizationOverview(history, cfg.monetizationGoals, new Date());
  const busy = isBusy('metrik');
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>💰 Monetisasi</h1>
          <div className="muted">
            Perkiraan kapan YouTube dan Facebook bisa dimonetisasi, dihitung dari laju pertumbuhan 28 hari terakhir. Angka dicatat otomatis
            sekali sehari{snapshot ? `; terakhir ${formatDate(snapshot.date)}` : ''} ({history.length} catatan).
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <AutoRefresh aktif={busy} detik={5} />
          <form action={refreshMetrics}>
            <SubmitButton className="sekunder" disabled={busy} teksProses="Memperbarui…">
              🔄 Perbarui data
            </SubmitButton>
          </form>
        </div>
      </div>
      {snapshot?.youtube && !snapshot.youtube.splitByContentType ? (
        <p className="kecil peringatan">YouTube belum bisa memisahkan Shorts dari video panjang, jadi jam tonton masih termasuk Shorts.</p>
      ) : null}
      <div className="grid2">
        <PlatformCard title="▶️ YouTube" progress={youtube} error={snapshot?.youtubeError} note={PLATFORM_NOTES.youtube} />
        <PlatformCard title="📘 Facebook" progress={facebook} error={snapshot?.facebookError} note={PLATFORM_NOTES.facebook} />
      </div>
      {snapshot?.facebook?.minutesViewed60 === null ? (
        <p className="kecil muted">
          Menit tonton Facebook butuh izin <code>read_insights</code>. Buat ulang token di Graph API Explorer dengan izin itu, lalu hubungkan
          ulang Page di Pengaturan → Facebook.
        </p>
      ) : null}
      <GoalForm goals={cfg.monetizationGoals} />
      <p className="kecil muted">
        Perkiraan mengandaikan laju 28 hari terakhir tetap. Channel yang masih baru biasanya tumbuh tidak rata, jadi angkanya akan berubah
        seiring data bertambah.
      </p>
    </div>
  );
}
