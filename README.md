# 🏢 Kantor AI — Channel Cerita Islami Anak

Kantor AI untuk channel YouTube cerita islami anak (usia 1–10 tahun, Bahasa Indonesia).
Dibangun dengan **Claude Agent SDK + Next.js + Remotion**. Biaya tambahan: **Rp0**
(memakai langganan Claude kamu, API YouTube gratis, render di laptop).

## Siapa saja "pegawainya"

| Pegawai | Tugas | File prompt |
|---|---|---|
| **Content Research** | Cari tren & celah topik di YouTube Indonesia + momen islami, usulkan 3–5 ide | `packages/agents/prompts/riset.md` |
| **Content Specialist (Penulis)** | Tulis naskah 3–5 menit dengan dalil bersumber | `prompts/penulis.md` |
| **Kids & Syariah Reviewer** | Periksa prinsip kualitas konten anak YouTube + kebenaran dalil, revisi otomatis maks. 2× | `prompts/reviewer.md` |
| **Video Creator (Sutradara)** | Ubah naskah jadi adegan (latar, karakter, ekspresi) lalu render dengan Remotion | `prompts/sutradara.md` + `packages/video` |
| **Channel Manager** | Judul/deskripsi/tag jujur, upload *Made for Kids*, jadwal tayang, laporan analytics | `prompts/channel-manager.md` |
| **Orchestrator** | Mengatur alur & gerbang persetujuan | `packages/agents/src/workflow.ts` |

Semua agen membaca **`prompts/pedoman-channel.md`** — "konstitusi" channel: karakter,
gaya bahasa, aturan syariat (tidak menggambar Nabi/sahabat/malaikat, dalil wajib bersumber)
dan aturan konten anak YouTube. Ubah file itu kalau arah channel berubah.

## Alur kerja (kamu = creative director)

```
🔎 Riset ──► 💡 Ide ──► ✍️ Penulis ⇄ 🧐 Reviewer ──► 👩 KAMU cek dalil & setujui naskah
                                                              │
   📺 Tayang ◄── 👩 KAMU tonton & jadwalkan ◄── 🎬 Render ◄── 🎙️ KAMU rekam suara ◄── 🎬 Sutradara + 📋 Metadata
                                                              
📊 Channel Manager membaca analytics ──► masukan untuk riset berikutnya
```

Tiga gerbang manusia itu sengaja: YouTube men-demonetisasi konten anak yang
*mass-produced*, dan isi agama harus diverifikasi manusia. Suara kamu sendiri + karakter
orisinal = konten autentik.

**Dua format video.** Setiap ide punya format: **Video biasa** (16:9, 3–5 menit) atau
**YouTube Shorts** (9:16 vertikal, < 60 detik, satu konsep). Agen riset mengusulkan
campuran keduanya; kamu memilih format saat menyetujui materi di halaman episode. Pilih
**Keduanya (Video + Shorts)** dan ide itu langsung dipecah jadi dua episode yang saling
tertaut (🔗), masing-masing dikerjakan penulis dengan gaya formatnya sendiri. Penulis, Sutradara, render, dan upload otomatis menyesuaikan (Shorts tanpa
thumbnail kustom, deskripsi diberi `#Shorts`). Pratinjau di Remotion Studio: komposisi
`Episode` (biasa) dan `Short`.

**Video hafalan surat** (menu **+ Hafalan**). Tanpa cerita dan tanpa penulis: pilih surat,
rentang ayat, dan berapa kali tiap ayat diulang. Teks Arab, latin, dan terjemah diambil
otomatis dari [equran.id](https://equran.id) (Kemenag RI), tidak pernah ditulis AI. Kamu
cek teksnya, lalu Ilustrator memilih latar sesuai arti tiap ayat (gurun, laut, gunung,
fajar, langit malam, dst.). Rekam bacaanmu dalam satu file dengan **jeda ±1 detik setelah
setiap bacaan**: video otomatis berpindah ayat/ulangan mengikuti jeda itu. Kalau ada yang
meleset, waktunya bisa dikoreksi di halaman episode. Pratinjau: komposisi `Hafalan`.

**🎵 Musik pembuka & penutup** (menu **Pengaturan**). Upload musik intro dan outro, atur
volumenya, dan pilih apakah dipakai juga di Shorts. Intro/outro otomatis memanjang mengikuti
musik (maks. 10/12 detik video biasa, 3/4 detik Shorts) dan musik dipudarkan di akhir. Berlaku
untuk render berikutnya. File tersimpan di `packages/video/public/musik/`. Pakai musik buatan
sendiri atau yang lisensinya jelas.

**💬 Chat dengan agen** (menu **Chat**). Tanya apa saja ke Mochi (manajer), Miku (riset),
Chimi (penulis), Choki (reviewer), Momo (sutradara), atau Lulu (channel manager), boleh
sambil memilih episode yang sedang dibahas. Agen hanya menjawab; pekerjaan tetap
dijalankan lewat tombol di dashboard. Riwayat obrolan tersimpan di `data/chat/`.

---

## Persiapan (sekali saja, ±30 menit)

### 1. Kebutuhan
- Node.js **20.12+** (cek: `node -v`)
- Langganan **Claude Pro/Max** + Claude Code terpasang:
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude          # login dengan akun Claude kamu, lalu keluar (/exit)
  ```
  Agent SDK otomatis memakai login ini. **Biarkan `ANTHROPIC_API_KEY` kosong** di `.env`,
  kalau diisi pemakaian ditagih per token.

### 2. Install
```bash
npm install
cp .env.example .env
```

### 3. Google Cloud (gratis)
1. Buka https://console.cloud.google.com → buat project baru, misal `kantor-ai`.
2. **APIs & Services → Library** → aktifkan **YouTube Data API v3** dan **YouTube Analytics API**.
3. **Credentials → Create credentials → API key** → isi `YOUTUBE_API_KEY` di `.env`.
4. **OAuth consent screen** → External → isi nama app & email kamu → tambahkan email
   pemilik channel di *Test users*.
   - Tips: setelah semuanya jalan, klik **Publish app** (status *In production*). Kalau tetap
     *Testing*, Google mematikan izin login setiap 7 hari. Peringatan "app belum
     diverifikasi" wajar karena ini app pribadimu — klik *Continue*.
5. **Credentials → Create credentials → OAuth client ID** → tipe **Desktop app** →
   isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`.
6. Hubungkan channel:
   ```bash
   npm run auth:youtube
   ```
   Buka URL yang muncul, login dengan akun pemilik channel. Token tersimpan di
   `data/secrets/` (sudah di-.gitignore — jangan dibagikan).

### 4. Jalankan kantor
```bash
npm run dev        # buka http://localhost:3000
```

Ada **episode contoh** "Bismillah Sebelum Makan" di papan kerja. Klik → **Render pratinjau
tanpa suara** untuk mencoba mesin video tanpa memakai Claude sama sekali.

> Render pertama mengunduh Chrome headless (±100 MB) secara otomatis. Font sudah ada di
> repo, jadi render selanjutnya bisa offline.

---

## Kantor 3D (`/kantor`)

Tampilan kantor isometrik: setiap agen punya meja dan karakter sendiri (Farhan si Manajer di
ruang kaca, Rani, Salma, Hafiz, Dimas, Nadia). Yang terjadi di layar mengikuti pekerjaan
yang sedang berjalan:

- **Cincin hijau + mengetik + monitor menyala** → agen sedang bekerja.
- **Cincin kuning + menengok** → Farhan menunggu persetujuanmu.
- **Gelembung abu-abu** → istirahat.
- Papan tulis di dinding: stiker warna = jumlah episode di tiap fase.
- Klik gelembung/karakter → riwayat aktivitas & tautan ke episode.

Status diperbarui tiap 3 detik. Semua furnitur & karakter dibuat dari bentuk dasar
three.js (React Three Fiber), jadi tanpa aset berbayar. Ganti nama, warna, atau posisi meja di
`apps/dashboard/components/kantor/pegawai.ts`; furnitur di `Furnitur.tsx`.

## Pemakaian harian

1. **Papan Kerja → 🔎 Cari ide baru** (boleh beri arahan, misal "persiapan Ramadhan").
   Riset ±3–8 menit. Atau tambah ide sendiri lewat **+ Ide Manual**.
2. Buka ide → **Tugaskan Penulis + Reviewer**.
3. Baca naskah. Cek **setiap dalil** (nomor ayat/hadits, teks Arab). Setujui, minta
   revisi, atau edit JSON-nya langsung.
4. Sutradara & Channel Manager bekerja → **rekam suaramu** (satu file, berurutan) → upload.
   Video otomatis dirender mengikuti panjang rekamanmu.
5. Tonton → **Setujui & jadwalkan**. Selesai.

Semua juga bisa lewat terminal:
```bash
npm run kantor -- riset "fokus adab untuk usia 4-6"
npm run kantor -- status
npm run kantor -- tulis <id-episode>
npm run kantor -- sutradara <id-episode>
npm run kantor -- render <id-episode>
npm run kantor -- upload <id-episode> 2026-11-01T16:30:00+07:00
npm run kantor -- laporan
```

### Otomatis tiap minggu (opsional)
Supaya riset & laporan jalan sendiri, pasang cron (macOS/Linux) — contoh Senin 07.00:
```
0 7 * * 1  cd /path/ke/kantor-ai-islami && npm run kantor -- laporan && npm run kantor -- riset
```
Windows: pakai Task Scheduler dengan perintah yang sama. Gerbang persetujuan tetap di kamu.

---

## Kustomisasi

| Mau ubah | Di mana |
|---|---|
| Nama channel, seri, playlist, jam tayang default | `kantor.config.json` (isi `playlistId` agar video otomatis masuk playlist) |
| Karakter, nilai, larangan | `packages/agents/prompts/pedoman-channel.md` |
| Gaya penulisan / struktur episode | `packages/agents/prompts/penulis.md` |
| Tampilan karakter | `packages/video/src/characters/Karakter.tsx` (SVG + React) |
| Latar baru | `packages/video/src/backgrounds/Latar.tsx` **dan** daftar `LATAR` di `packages/shared/src/constants.ts` |
| Tempo subtitle/durasi | `packages/shared/src/timing.ts` |
| Model Claude | `KANTOR_MODEL` di `.env` (kosong = default) |

Pratinjau template video secara interaktif: `npm run studio`.

## Struktur proyek
```
apps/dashboard      Next.js — papan kerja, kantor 3D & gerbang persetujuan
packages/agents     Claude Agent SDK — orchestrator, 5 agen, tool YouTube, CLI
packages/video      Remotion — karakter, latar, template episode & thumbnail
packages/shared     Tipe data, konstanta, penyimpanan JSON
data/               Episode (JSON), riset, laporan, render, log, rahasia
```

## Catatan penting
- **Kuota Claude**: agen memakai kuota langganan yang sama dengan chat kamu. Satu episode
  (naskah + review + sutradara + metadata) relatif ringan; riset paling berat. Jangan
  menjalankan banyak riset sekaligus.
- **Kuota YouTube API**: gratis 10.000 unit/hari; setiap pencarian riset ±100 unit. Cukup
  untuk beberapa riset per hari.
- **Thumbnail kustom** butuh channel terverifikasi nomor HP di YouTube.
- **Label AI**: animasi kartun tidak termasuk konten sintetis realistis, jadi
  `containsSyntheticMedia` diset `false`. Ubah di `packages/agents/src/youtube/upload.ts`
  kalau suatu saat memakai suara/visual AI yang realistis.
- **Lisensi**: Remotion gratis untuk individu & perusahaan ≤ 3 orang. Font Fredoka, Nunito,
  Noto Naskh Arabic berlisensi SIL OFL (bebas komersial).
- **Episode contoh**: doa "Allahumma barik lana…" sengaja diberi catatan cek sanad — contoh
  bagaimana reviewer menandai hal yang wajib kamu verifikasi.
