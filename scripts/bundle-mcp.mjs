#!/usr/bin/env node
/**
 * Bundle each stdio MCP server into a single self-contained JS file.
 *
 * Why: stdio MCP servers spawn as child processes. On Vercel,
 * Next.js's `outputFileTracingIncludes` cannot reliably follow the full
 * runtime dep tree of these packages (each MCP server pulls in
 * @modelcontextprotocol/sdk, which itself depends on hono, express,
 * jose, ajv, eventsource, etc.). After a few iterations of patching
 * tracing globs, the dep closure is too large to enumerate by hand and
 * too big to brute-force include (node_modules is 814MB; the function
 * size cap is 250MB unzipped).
 *
 * Solution: pre-bundle each MCP server with @vercel/ncc into a single
 * file that has every transitive dep inlined. The output (~5–15MB
 * per server) is what ships in the function bundle. lib/mcp-clients.ts
 * spawns `node bundled-mcp/<name>/index.js` instead of the raw bin.
 *
 * This script runs in the `prebuild` npm step, before `next build`.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const OUT_ROOT = join(REPO_ROOT, 'bundled-mcp');

const TARGETS = [
  {
    name: 'open-meteo',
    entry: 'node_modules/open-meteo-mcp-server/dist/index.js',
  },
  {
    name: 'google-maps',
    entry: 'node_modules/@modelcontextprotocol/server-google-maps/dist/index.js',
  },
  {
    name: 'filesystem',
    entry: 'node_modules/@modelcontextprotocol/server-filesystem/dist/index.js',
  },
];

function runNcc({ entry, outDir }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes',
        '@vercel/ncc@latest',
        'build',
        entry,
        '-o',
        outDir,
        '--target',
        'es2022',
        '--no-source-map-register',
      ],
      { cwd: REPO_ROOT, stdio: 'inherit' },
    );
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ncc exited with code ${code} for ${entry}`)),
    );
    child.on('error', reject);
  });
}

async function main() {
  // Reset output
  if (existsSync(OUT_ROOT)) rmSync(OUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  for (const target of TARGETS) {
    const entry = join(REPO_ROOT, target.entry);
    if (!existsSync(entry)) {
      throw new Error(`Missing MCP server entry: ${target.entry}`);
    }
    const outDir = join(OUT_ROOT, target.name);
    mkdirSync(outDir, { recursive: true });
    console.log(`[bundle-mcp] ${target.name} ← ${target.entry}`);
    await runNcc({ entry, outDir });
    const indexPath = join(outDir, 'index.js');
    if (!existsSync(indexPath)) {
      throw new Error(`ncc did not produce ${indexPath}`);
    }
    const sizeMB = (statSync(indexPath).size / 1024 / 1024).toFixed(2);
    console.log(`[bundle-mcp]   → ${target.name}/index.js (${sizeMB}MB)`);
  }

  console.log('[bundle-mcp] All MCP server bundles built.');
}

main().catch((err) => {
  console.error('[bundle-mcp] FAILED:', err);
  process.exit(1);
});
