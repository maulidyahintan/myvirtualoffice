import Link from 'next/link';

export default function TidakDitemukan() {
  return (
    <div className="panel stack" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🌙</div>
      <h1>Halaman tidak ditemukan</h1>
      <p className="muted" style={{ margin: 0 }}>
        Mungkin episodenya sudah dihapus atau alamatnya salah ketik.
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link href="/papan-kerja" className="tombol">
          🗂️ Ke Papan Kerja
        </Link>
      </div>
    </div>
  );
}
