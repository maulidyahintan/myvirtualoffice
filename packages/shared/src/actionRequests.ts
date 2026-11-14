// New actions the Director asked for because no existing one fits the story (e.g. tearing a book). Each request
// is built by the action builder on its own git branch and merged once the owner approves its sample clip.
// The pure helpers are unit-tested; the store keeps one JSON file per request in data/action-requests.
import fs from 'node:fs';
import path from 'node:path';
import { ACTIONS } from './constants.ts';
import { paths } from './store.ts';
import type { Character } from './types.ts';

export const ACTION_REQUEST_STATUSES = ['requested', 'building', 'ready', 'approved', 'rejected', 'failed'] as const;
export type ActionRequestStatus = (typeof ACTION_REQUEST_STATUSES)[number];

export const ACTION_REQUEST_STATUS_LABEL: Record<ActionRequestStatus, string> = {
  requested: 'Diminta Sutradara',
  building: 'Sedang dibuat…',
  ready: 'Siap ditinjau',
  approved: 'Sudah dipakai',
  rejected: 'Ditolak',
  failed: 'Gagal dibuat',
};

export interface ActionRequestRef {
  episodeId: string;
  /** 1-based scene number */
  scene: number;
}

export interface ActionRequest {
  /** Action id in kebab-case English, e.g. "tearing-book". */
  name: string;
  /** What the movement looks like, in the owner's language. */
  description: string;
  characters: Character[];
  scenes: ActionRequestRef[];
  status: ActionRequestStatus;
  created: string;
  updated: string;
  /** Why it failed, or what the builder did. */
  note?: string;
  /** Git branch with the built action, until it is merged or dropped. */
  branch?: string;
  /** Sample clip in data/renders. */
  sample?: string;
}

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+){0,4}$/;
const MAX_NAME_LENGTH = 40;

/** A requested action name as an action id, or undefined when unusable or already an existing action. */
export function actionSlug(raw: string): string | undefined {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!NAME_PATTERN.test(slug) || slug.length > MAX_NAME_LENGTH) return undefined;
  return (ACTIONS as readonly string[]).includes(slug) ? undefined : slug;
}

/** Add one scene's request to an existing request (or start a new one); already built ones stay as they are. */
export function mergeActionRequest(
  existing: ActionRequest | undefined,
  incoming: { name: string; description: string; character: Character },
  ref: ActionRequestRef,
  now: string,
): ActionRequest {
  const base: ActionRequest = existing ?? {
    name: incoming.name,
    description: incoming.description,
    characters: [],
    scenes: [],
    status: 'requested',
    created: now,
    updated: now,
  };
  const knownScene = base.scenes.some((s) => s.episodeId === ref.episodeId && s.scene === ref.scene);
  return {
    ...base,
    characters: base.characters.includes(incoming.character) ? base.characters : [...base.characters, incoming.character],
    scenes: knownScene ? base.scenes : [...base.scenes, ref],
    // a request that failed or was turned down can be asked for again
    status: base.status === 'failed' || base.status === 'rejected' ? 'requested' : base.status,
    updated: now,
  };
}

// ---- store: data/action-requests/<name>.json

const dir = () => {
  const d = path.join(paths.data(), 'action-requests');
  fs.mkdirSync(d, { recursive: true });
  return d;
};

export function listActionRequests(): ActionRequest[] {
  return fs
    .readdirSync(dir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir(), f), 'utf8')) as ActionRequest)
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

export function getActionRequest(name: string): ActionRequest | undefined {
  const file = path.join(dir(), `${path.basename(name)}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as ActionRequest) : undefined;
}

export function saveActionRequest(request: ActionRequest) {
  fs.writeFileSync(path.join(dir(), `${path.basename(request.name)}.json`), `${JSON.stringify(request, null, 2)}\n`);
}

/** Change a request's status (and note), keeping the rest. */
export function updateActionRequest(name: string, change: Partial<Omit<ActionRequest, 'name'>>): ActionRequest | undefined {
  const current = getActionRequest(name);
  if (!current) return undefined;
  const next = { ...current, ...change, updated: new Date().toISOString() };
  saveActionRequest(next);
  return next;
}
