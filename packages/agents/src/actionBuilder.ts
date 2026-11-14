// Builds an action the Director asked for: a coding agent writes it on its own git branch (in a separate
// worktree, guarded by actionGuard), the typecheck and tests must pass, then a sample clip is rendered for the
// owner. Approving merges the branch into the project; rejecting drops it.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  BACKGROUNDS,
  EXPRESSIONS,
  addLog,
  getActionRequest,
  loadConfig,
  paths,
  rootDir,
  updateActionRequest,
  type ActionRequest,
  type Scene,
} from '@kantor/shared';
import { toolDecision } from './actionGuard.ts';

const run = promisify(execFile);
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
/** The agent gets a second try with the errors when the typecheck or tests fail. */
const MAX_ATTEMPTS = 2;
const MAX_AGENT_TURNS = 80;
const ERROR_EXCERPT_CHARS = 4000;
const CO_AUTHOR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
const TYPECHECKED = ['packages/shared', 'packages/video', 'packages/agents', 'apps/dashboard'];

const BuilderOutput = z.object({
  summary: z.string(),
  sample: z.object({
    background: z.enum(BACKGROUNDS),
    characters: z.array(z.string()).max(3),
    expression: z.enum(EXPRESSIONS),
    narration: z.string(),
  }),
});
type BuilderResult = z.infer<typeof BuilderOutput>;

const branchOf = (name: string) => `action/${name}`;
const worktreeOf = (name: string) => path.join(rootDir(), '..', '.kantor-aksi', name);
const sampleFile = (name: string) => `aksi-${name}.mp4`;

async function git(args: string[], cwd = rootDir()) {
  return run('git', args, { cwd, maxBuffer: MAX_OUTPUT_BYTES });
}

/** Installed packages are shared with the project: link them into the worktree (its own packages stay its own). */
function linkInstalledPackages(worktree: string) {
  const root = rootDir();
  const modules = path.join(worktree, 'node_modules');
  fs.mkdirSync(path.join(modules, '@kantor'), { recursive: true });
  for (const entry of fs.readdirSync(path.join(root, 'node_modules'))) {
    if (entry !== '@kantor') fs.symlinkSync(path.join(root, 'node_modules', entry), path.join(modules, entry));
  }
  for (const pkg of fs.readdirSync(path.join(root, 'node_modules', '@kantor'))) {
    const real = fs.realpathSync(path.join(root, 'node_modules', '@kantor', pkg));
    fs.symlinkSync(path.join(worktree, path.relative(root, real)), path.join(modules, '@kantor', pkg));
  }
  for (const dir of TYPECHECKED) {
    const own = path.join(root, dir, 'node_modules');
    if (fs.existsSync(own)) fs.symlinkSync(own, path.join(worktree, dir, 'node_modules'));
  }
}

async function removeWorktree(name: string) {
  const worktree = worktreeOf(name);
  if (fs.existsSync(worktree)) await git(['worktree', 'remove', '--force', worktree]).catch(() => fs.rmSync(worktree, { recursive: true, force: true }));
  await git(['worktree', 'prune']);
}

async function prepareWorktree(name: string): Promise<string> {
  await removeWorktree(name);
  await git(['branch', '-D', branchOf(name)]).catch(() => undefined); // no branch yet is fine
  const worktree = worktreeOf(name);
  fs.mkdirSync(path.dirname(worktree), { recursive: true });
  await git(['worktree', 'add', '-b', branchOf(name), worktree, 'HEAD']);
  linkInstalledPackages(worktree);
  return worktree;
}

function buildPrompt(request: ActionRequest, feedback?: string): string {
  return [
    `Buat aksi baru dengan id \`${request.name}\`.`,
    `Gerakan yang diminta Sutradara: ${request.description}`,
    `Tokoh yang melakukannya: ${request.characters.join(', ')}.`,
    feedback ? `Percobaan sebelumnya belum lolos pemeriksaan. Perbaiki error ini:\n${feedback}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function runBuilderAgent(request: ActionRequest, worktree: string, feedback?: string): Promise<BuilderResult> {
  const systemPrompt = fs.readFileSync(path.join(paths.prompts(), 'pembuat-aksi.md'), 'utf8');
  const { $schema: _, ...schema } = z.toJSONSchema(BuilderOutput, { target: 'draft-7' }) as Record<string, unknown>;
  const conversation = query({
    prompt: buildPrompt(request, feedback),
    options: {
      cwd: worktree,
      systemPrompt,
      model: process.env.KANTOR_MODEL || undefined,
      tools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'],
      permissionMode: 'default',
      canUseTool: async (toolName, input) => toolDecision(toolName, input, worktree),
      maxTurns: MAX_AGENT_TURNS,
      settingSources: [],
      outputFormat: { type: 'json_schema', schema },
    },
  });
  for await (const message of conversation) {
    if (message.type !== 'result') continue;
    if (message.subtype !== 'success') throw new Error(`Pembuat aksi berhenti: ${message.subtype}`);
    const parsed = BuilderOutput.safeParse(message.structured_output);
    if (!parsed.success) throw new Error(`Hasil pembuat aksi tidak sesuai format: ${parsed.error.message}`);
    return parsed.data;
  }
  throw new Error('Pembuat aksi berhenti tanpa hasil');
}

/** Typecheck every package and run the tests in the worktree; the errors when something fails. */
async function verify(worktree: string): Promise<string | undefined> {
  const failures: string[] = [];
  for (const dir of TYPECHECKED) {
    await run('npx', ['--no-install', 'tsc', '--noEmit', '-p', dir], { cwd: worktree, maxBuffer: MAX_OUTPUT_BYTES }).catch((error: { stdout?: string }) =>
      failures.push(`tsc ${dir}:\n${error.stdout ?? String(error)}`),
    );
  }
  await run('npx', ['--no-install', 'vitest', 'run', '--passWithNoTests'], { cwd: worktree, maxBuffer: MAX_OUTPUT_BYTES }).catch(
    (error: { stdout?: string }) => failures.push(`vitest:\n${error.stdout ?? String(error)}`),
  );
  return failures.length ? failures.join('\n\n').slice(0, ERROR_EXCERPT_CHARS) : undefined;
}

async function renderSample(request: ActionRequest, sample: BuilderResult['sample'], worktree: string): Promise<string> {
  const cfg = loadConfig();
  const actor = request.characters[0];
  const scene = {
    type: 'story',
    speaker: 'narrator',
    narration: sample.narration,
    background: sample.background,
    characters: sample.characters.includes(actor) ? sample.characters : [actor, ...sample.characters].slice(0, 3),
    expression: sample.expression,
    actions: [{ character: actor, action: request.name }],
  } as unknown as Scene;
  const props = { channelName: cfg.channelName, seriesName: 'Contoh aksi baru', title: request.name, scenes: [scene], characterLooks: cfg.characterLooks };
  const propsFile = path.join(worktree, 'contoh-aksi.props.json');
  fs.writeFileSync(propsFile, JSON.stringify(props));
  const output = path.join(paths.renders(), sampleFile(request.name));
  await run('npx', ['--no-install', 'remotion', 'render', 'src/index.ts', 'Episode', output, `--props=${propsFile}`, '--scale=0.5', '--log=error'], {
    cwd: path.join(worktree, 'packages/video'),
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  fs.rmSync(propsFile, { force: true });
  return sampleFile(request.name);
}

/** Build a requested action on its own branch and render its sample clip. */
export async function buildActionRequest(name: string) {
  const request = getActionRequest(name);
  if (!request) throw new Error(`Permintaan aksi ${name} tidak ada`);
  updateActionRequest(name, { status: 'building', note: 'Pembuat aksi sedang menulis gerakannya…' });
  try {
    const worktree = await prepareWorktree(name);
    let feedback: string | undefined;
    let result: BuilderResult | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      result = await runBuilderAgent(request, worktree, feedback);
      feedback = await verify(worktree);
      if (!feedback) break;
    }
    if (feedback || !result) throw new Error(`Typecheck/test belum lolos:\n${feedback ?? ''}`);
    await git(['add', '-A'], worktree);
    await git(['commit', '-q', '-m', `feat(video): add the '${name}' action`, '-m', result.summary, '-m', CO_AUTHOR], worktree);
    updateActionRequest(name, { note: 'Merender klip contoh…' });
    const sample = await renderSample(request, result.sample, worktree);
    updateActionRequest(name, { status: 'ready', note: result.summary, branch: branchOf(name), sample });
  } catch (error) {
    updateActionRequest(name, { status: 'failed', note: error instanceof Error ? error.message.slice(0, ERROR_EXCERPT_CHARS) : String(error) });
    throw error;
  }
}

/** Merge an approved action into the project and tell the episodes that asked for it. */
export async function approveActionRequest(name: string) {
  const request = getActionRequest(name);
  if (!request?.branch || request.status !== 'ready') throw new Error(`Aksi ${name} belum siap digabung`);
  try {
    await git(['merge', '--no-ff', request.branch, '-m', `feat(video): merge the '${name}' action approved by the owner`, '-m', CO_AUTHOR]);
  } catch (error) {
    await git(['merge', '--abort']).catch(() => undefined); // nothing to abort when the merge did not start
    const reason = error instanceof Error ? error.message : String(error);
    updateActionRequest(name, { note: `Belum bisa digabung (simpan atau commit dulu perubahan yang terbuka): ${reason.slice(0, 500)}` });
    throw error;
  }
  await removeWorktree(name);
  await git(['branch', '-d', request.branch]).catch(() => undefined); // already merged, deleting is tidy-up only
  updateActionRequest(name, { status: 'approved', branch: undefined });
  for (const ref of request.scenes) {
    addLog(ref.episodeId, 'pembuat-aksi', `Aksi baru "${name}" sudah tersedia untuk adegan ${ref.scene}; klik "Pakai di adegan" di halaman Aksi Baru`);
  }
}

/** Drop a built action: its branch and worktree are removed. */
export async function rejectActionRequest(name: string) {
  const request = getActionRequest(name);
  if (!request) throw new Error(`Permintaan aksi ${name} tidak ada`);
  await removeWorktree(name);
  await git(['branch', '-D', branchOf(name)]).catch(() => undefined); // never built: no branch
  fs.rmSync(path.join(paths.renders(), sampleFile(name)), { force: true });
  updateActionRequest(name, { status: 'rejected', branch: undefined, sample: undefined });
}
