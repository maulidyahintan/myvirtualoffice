// What the action builder (a coding agent) may do in its own git worktree: read anything inside it, change
// code inside it (never the data, git internals or installed packages), and run only the typecheck and tests.
// Pure, unit-tested; the builder answers every tool request with this decision.
import path from 'node:path';

export type ToolDecision = { behavior: 'allow' } | { behavior: 'deny'; message: string };

const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS']);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);
const PROTECTED_DIRS = ['data', '.git', 'node_modules'];
/** Typecheck and tests only, without chaining, redirection or substitution. */
const ALLOWED_COMMAND = /^(npx (--no-install )?(tsc|vitest)|npm (run )?test)( [^;&|`$<>\n]*)?$/;
/** Removing one scratch file the builder made: a single plain path, no options or wildcards. */
const REMOVE_ONE_FILE = /^rm ([\w./-]+)$/;

const inside = (root: string, target: string) => {
  const relative = path.relative(root, path.resolve(root, target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

function pathOf(input: Record<string, unknown>): string | undefined {
  const value = input.file_path ?? input.path ?? input.notebook_path;
  return typeof value === 'string' ? value : undefined;
}

/** Changing (or removing) a file: only code inside the worktree, never the data, git internals or packages. */
function writeDecision(target: string | undefined, root: string): ToolDecision {
  if (!target || !inside(root, target)) return { behavior: 'deny', message: 'Hanya boleh mengubah file di dalam proyek ini.' };
  const first = path.relative(root, path.resolve(root, target)).split(path.sep)[0];
  return PROTECTED_DIRS.includes(first) ? { behavior: 'deny', message: `Folder ${first} tidak boleh diubah.` } : { behavior: 'allow' };
}

export function toolDecision(toolName: string, input: Record<string, unknown>, root: string): ToolDecision {
  const target = pathOf(input);
  if (READ_TOOLS.has(toolName)) {
    return !target || inside(root, target) ? { behavior: 'allow' } : { behavior: 'deny', message: 'Hanya boleh membaca di dalam proyek ini.' };
  }
  if (WRITE_TOOLS.has(toolName)) return writeDecision(target, root);
  if (toolName === 'Bash') {
    const command = typeof input.command === 'string' ? input.command.trim() : '';
    if (ALLOWED_COMMAND.test(command)) return { behavior: 'allow' };
    const removed = REMOVE_ONE_FILE.exec(command)?.[1];
    if (removed && !removed.startsWith('-')) return writeDecision(removed, root);
    return { behavior: 'deny', message: 'Hanya boleh menjalankan typecheck (npx tsc), test (npx vitest / npm test), atau rm satu file.' };
  }
  return { behavior: 'deny', message: `Tool ${toolName} tidak dipakai untuk membuat aksi.` };
}
