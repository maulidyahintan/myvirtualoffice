import { redirect } from 'next/navigation';

// Kantor 3D sekarang jadi halaman utama; alamat lama tetap bisa dibuka.
export default function KantorLama() {
  redirect('/');
}
