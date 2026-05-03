import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Spawn MCP servers from local node_modules/.bin instead of `npx -y <pkg>`.
 *
 * On Vercel's serverless sandbox, `npx -y` tries to install the package on
 * demand and write to `~/.npm`, but `$HOME` is `/home/sbx_user<id>` which
 * does not exist and is read-only — npm fails with ENOENT and the MCP child
 * process exits with code -32000 before the SDK can even handshake.
 *
 * Direct-spawning the bin avoids npm entirely: the file has a
 * `#!/usr/bin/env node` shebang, the package is already installed by Vercel
 * during build, and `outputFileTracingIncludes` (next.config.ts) ships the
 * server packages + bin symlinks into the function bundle.
 *
 * We still inject `HOME=/tmp` into the child env in case any transitive
 * tool (axios cache, npm config lookups, etc.) tries to touch a home dir.
 */

const BUNDLE_DIR = path.join(process.cwd(), 'bundled-mcp');
const SAFE_HOME = '/tmp';

async function connect(opts: {
  name: string;
  /** Folder under bundled-mcp/ — points at index.js */
  bundle: string;
  args?: string[];
  env?: Record<string, string>;
}) {
  const baseEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') baseEnv[k] = v;
  }
  baseEnv.HOME = SAFE_HOME;
  baseEnv.npm_config_cache = '/tmp/.npm';

  const bundlePath = path.join(BUNDLE_DIR, opts.bundle, 'index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [bundlePath, ...(opts.args ?? [])],
    env: { ...baseEnv, ...(opts.env ?? {}) },
  });
  const client = new Client({ name: opts.name, version: '0.1.0' });
  await client.connect(transport);
  return client;
}

export async function getOpenMeteoMcp() {
  return connect({
    name: 'surftrip-open-meteo',
    bundle: 'open-meteo',
  });
}

export async function getMapsMcp() {
  return connect({
    name: 'surftrip-google-maps',
    bundle: 'google-maps',
    env: { GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '' },
  });
}

// Match narrator's EXPORTS_DIR resolution so the MCP root + the agent's
// hardcoded paths line up (Vercel: /tmp/exports, local: ./exports).
const EXPORTS_DIR =
  process.env.TRIP_EXPORTS_DIR ??
  (process.env.VERCEL ? '/tmp/exports' : './exports');

export async function getFilesystemMcp() {
  // Ensure the dir exists before the MCP server tries to chdir into it.
  try {
    const fs = await import('node:fs');
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  } catch {
    /* ignore — narrator also mkdirs */
  }
  return connect({
    name: 'surftrip-filesystem',
    bundle: 'filesystem',
    args: [EXPORTS_DIR],
  });
}
