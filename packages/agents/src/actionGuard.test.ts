import { describe, expect, it } from 'vitest';
import { toolDecision } from './actionGuard.ts';

const ROOT = '/work/aksi/tearing-book';
const allowed = (tool: string, input: Record<string, unknown>) => toolDecision(tool, input, ROOT).behavior === 'allow';

describe('toolDecision', () => {
  it('lets the builder read and search inside its worktree only', () => {
    expect(allowed('Read', { file_path: `${ROOT}/packages/video/src/SceneView.tsx` })).toBe(true);
    expect(allowed('Grep', { pattern: 'ACTIONS' })).toBe(true);
    expect(allowed('Read', { file_path: '/Users/someone/.ssh/id_rsa' })).toBe(false);
    expect(allowed('Glob', { path: `${ROOT}/../other` })).toBe(false);
  });

  it('lets it change code but not data, git internals or packages', () => {
    expect(allowed('Edit', { file_path: `${ROOT}/packages/shared/src/constants.ts` })).toBe(true);
    expect(allowed('Write', { file_path: 'packages/video/src/characters/tearing.ts' })).toBe(true);
    expect(allowed('Write', { file_path: `${ROOT}/data/episodes/x.json` })).toBe(false);
    expect(allowed('Edit', { file_path: `${ROOT}/.git/config` })).toBe(false);
    expect(allowed('Write', { file_path: `${ROOT}/node_modules/x.js` })).toBe(false);
    expect(allowed('Write', { file_path: '/tmp/elsewhere.ts' })).toBe(false);
  });

  it('runs only the typecheck and the tests', () => {
    expect(allowed('Bash', { command: 'npx tsc --noEmit -p packages/video' })).toBe(true);
    expect(allowed('Bash', { command: 'npx vitest run packages/video' })).toBe(true);
    expect(allowed('Bash', { command: 'npm test' })).toBe(true);
    expect(allowed('Bash', { command: 'npx tsc --noEmit && rm -rf /' })).toBe(false);
    expect(allowed('Bash', { command: 'curl https://example.com' })).toBe(false);
    expect(allowed('Bash', { command: 'npx vitest run $(cat secret)' })).toBe(false);
  });

  it('lets it remove one scratch file of its own, nothing more', () => {
    expect(allowed('Bash', { command: 'rm packages/video/src/characters/probe.test.ts' })).toBe(true);
    expect(allowed('Bash', { command: 'rm -rf packages' })).toBe(false);
    expect(allowed('Bash', { command: 'rm packages/*.ts' })).toBe(false);
    expect(allowed('Bash', { command: 'rm data/episodes/x.json' })).toBe(false);
    expect(allowed('Bash', { command: 'rm ../../outside.ts' })).toBe(false);
  });

  it('refuses any other tool', () => {
    expect(allowed('WebFetch', { url: 'https://example.com' })).toBe(false);
  });
});
