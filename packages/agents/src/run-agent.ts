// Pembungkus Claude Agent SDK: menjalankan satu "pegawai" dengan system prompt-nya
// sendiri dan memaksa hasilnya berupa JSON yang tervalidasi.
import fs from 'node:fs';
import path from 'node:path';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { paths } from '@kantor/shared';

export interface AgentSpec<S extends z.ZodType> {
  /** Nama file prompt di packages/agents/prompts (tanpa .md) */
  peran: string;
  prompt: string;
  schema: S;
  /** Tool bawaan yang diizinkan, misal ['WebSearch', 'WebFetch'] */
  tools?: string[];
  mcpServers?: Options['mcpServers'];
  /** Nama tool MCP yang diizinkan (format mcp__server__tool) */
  mcpTools?: string[];
  maxTurns?: number;
  onProgress?: (pesan: string) => void;
}

function bacaPrompt(nama: string) {
  return fs.readFileSync(path.join(paths.prompts(), `${nama}.md`), 'utf8');
}

export async function runAgent<S extends z.ZodType>(spec: AgentSpec<S>): Promise<z.infer<S>> {
  const systemPrompt = [bacaPrompt(spec.peran), '---', bacaPrompt('pedoman-channel')].join('\n\n');
  const tools = spec.tools ?? [];
  const allowed = [...tools, ...(spec.mcpTools ?? [])];

  const q = query({
    prompt: spec.prompt,
    options: {
      systemPrompt,
      model: process.env.KANTOR_MODEL || undefined,
      tools, // hanya tool bawaan yang disebut; tidak ada Bash/Edit/Write
      allowedTools: allowed,
      permissionMode: 'dontAsk', // tool di luar daftar langsung ditolak
      mcpServers: spec.mcpServers,
      maxTurns: spec.maxTurns ?? 10,
      settingSources: [], // jangan baca CLAUDE.md / setting lain di komputer
      outputFormat: { type: 'json_schema', schema: jsonSchemaUntukCli(spec.schema) },
    },
  });

  for await (const msg of q) {
    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use') spec.onProgress?.(`memakai ${block.name}`);
      }
    }
    if (msg.type === 'result') {
      if (msg.subtype !== 'success') {
        throw new Error(`Agen ${spec.peran} gagal: ${msg.subtype}`);
      }
      const output = msg.structured_output ?? tryJson(msg.result);
      // Error API (misal kredit habis) tetap datang sebagai "success" berisi teks biasa.
      if (output === undefined) {
        throw new Error(`Agen ${spec.peran} tidak mengembalikan JSON: ${String(msg.result).slice(0, 300)}`);
      }
      const parsed = spec.schema.safeParse(output);
      if (!parsed.success) {
        throw new Error(`Output agen ${spec.peran} tidak sesuai format: ${parsed.error.message}`);
      }
      return parsed.data;
    }
  }
  throw new Error(`Agen ${spec.peran} berhenti tanpa hasil`);
}

// Validator di CLI Claude Code tidak mengenal draft 2020-12 (default Zod 4),
// jadi pakai draft-7 dan buang field $schema.
function jsonSchemaUntukCli(schema: z.ZodType) {
  const { $schema: _, ...rest } = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  return rest;
}

function tryJson(s: unknown) {
  if (typeof s !== 'string') return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
