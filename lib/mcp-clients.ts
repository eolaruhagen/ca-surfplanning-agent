import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function connect(opts: { name: string; command: string; args: string[]; env?: Record<string, string> }) {
  const transport = new StdioClientTransport({
    command: opts.command,
    args: opts.args,
    env: opts.env ? { ...process.env, ...opts.env } as Record<string, string> : undefined,
  });
  const client = new Client({ name: opts.name, version: '0.1.0' });
  await client.connect(transport);
  return client;
}

export async function getOpenMeteoMcp() {
  return connect({
    name: 'surftrip-open-meteo',
    command: 'npx',
    args: ['-y', 'open-meteo-mcp-server'],
  });
}

export async function getMapsMcp() {
  return connect({
    name: 'surftrip-google-maps',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: { GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '' },
  });
}

export async function getFilesystemMcp() {
  return connect({
    name: 'surftrip-filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', './exports'],
  });
}
