import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Laptop biasa: pakai separuh core supaya komputer tetap bisa dipakai saat render.
Config.setConcurrency('50%');

// Opsional: pakai Chrome yang sudah terpasang (isi REMOTION_BROWSER_EXECUTABLE di .env)
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
