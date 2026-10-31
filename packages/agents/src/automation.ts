// Automated tasks: Content Research finds ideas daily.
// launchd (macOS) runs `kantor harian` every 30 minutes; research runs once per day,
// first time after configured hour. Mac sleeping at that time will research when it wakes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  readAutomationState,
  dailySchedulerFile,
  isoToLocal,
  loadConfig,
  paths,
  dailyResearchSettings,
  rootDir,
  isBusy,
  saveAutomationState,
  markDone,
  markBusy,
} from '@kantor/shared';
import { research } from './workflow.ts';

const MAX_ATTEMPTS = 2;
const schedulerFile = dailySchedulerFile;
const LABEL = path.basename(schedulerFile(), '.plist');

/** Run daily research if past configured time and not yet done today. */
export async function runDailyResearchIfDue() {
  const settings = dailyResearchSettings();
  if (!settings.active) return console.log('Riset harian nonaktif');
  const cfg = loadConfig();
  const now = isoToLocal(new Date().toISOString(), cfg.timeZone);
  const [date, time] = now.split('T');
  if (time < settings.time) return console.log(`Belum jam ${settings.time}`);

  const state = readAutomationState();
  const isToday = state.date === date;
  // 'running' without active research process = previous process died mid-run
  if (isToday && (state.result === 'ok' || (state.result === 'running' && isBusy('riset')))) return console.log('Riset hari ini sudah jalan');
  if (isToday && (state.attempts ?? 0) >= MAX_ATTEMPTS) return console.log('Riset hari ini sudah gagal 2x, dicoba lagi besok');
  if (isBusy('riset')) return console.log('Riset lain sedang berjalan');

  const attempts = isToday ? (state.attempts ?? 0) + 1 : 1;
  saveAutomationState({ date, attempts, result: 'running', time: new Date().toISOString() });
  markBusy('riset');
  try {
    const { episodes } = await research(undefined, settings.ideaCount);
    saveAutomationState({ date, attempts, result: 'ok', message: `${episodes.length} ide baru`, time: new Date().toISOString() });
  } catch (e) {
    saveAutomationState({ date, attempts, result: 'failed', message: (e as Error).message.slice(0, 300), time: new Date().toISOString() });
    throw e;
  } finally {
    markDone('riset');
  }
}

/** Install launchd scheduler (every 30 minutes + at login). Safe to run multiple times. */
export function installScheduler() {
  const root = rootDir();
  const node = process.execPath;
  const log = path.join(paths.logs(), 'harian.log');
  fs.mkdirSync(paths.logs(), { recursive: true });
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escape(node)}</string>
    <string>--import</string>
    <string>tsx</string>
    <string>${escape(path.join(root, 'packages/agents/src/cli.ts'))}</string>
    <string>harian</string>
  </array>
  <key>WorkingDirectory</key><string>${escape(root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>KANTOR_ROOT</key><string>${escape(root)}</string>
    <key>PATH</key><string>${escape(path.dirname(node))}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartInterval</key><integer>1800</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${escape(log)}</string>
  <key>StandardErrorPath</key><string>${escape(log)}</string>
</dict>
</plist>
`;
  fs.mkdirSync(path.dirname(schedulerFile()), { recursive: true });
  fs.writeFileSync(schedulerFile(), plist);
  const domain = `gui/${os.userInfo().uid}`;
  try {
    execFileSync('launchctl', ['bootout', domain, schedulerFile()], { stdio: 'ignore' });
  } catch {
    /* not installed yet */
  }
  execFileSync('launchctl', ['bootstrap', domain, schedulerFile()]);
  console.log(`✅ Penjadwal terpasang: ${schedulerFile()}`);
}

export function uninstallScheduler() {
  try {
    execFileSync('launchctl', ['bootout', `gui/${os.userInfo().uid}`, schedulerFile()], { stdio: 'ignore' });
  } catch {
    /* already stopped */
  }
  fs.rmSync(schedulerFile(), { force: true });
  console.log('✅ Penjadwal dilepas');
}
