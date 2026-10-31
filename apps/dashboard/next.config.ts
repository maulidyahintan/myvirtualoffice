import type { NextConfig } from 'next';

// Old Indonesian paths keep working (bookmarks) and redirect to the English routes.
const OLD_ROUTES: [string, string][] = [
  ['/papan-kerja', '/board'],
  ['/jadwal', '/schedule'],
  ['/tayang', '/published'],
  ['/pengaturan', '/settings'],
  ['/laporan', '/reports'],
  ['/ide-baru', '/ideas/new'],
  ['/hafalan-baru', '/memorization/new'],
  ['/kantor', '/'],
];

const config: NextConfig = {
  transpilePackages: ['@kantor/shared'],
  async redirects() {
    return OLD_ROUTES.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default config;
