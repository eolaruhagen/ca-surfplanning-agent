import { kv as vercelKv } from '@vercel/kv';
import { createClient, type RedisClientType } from 'redis';

type KvLike = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<unknown>;
};

const isProd = process.env.VERCEL === '1';

let localClient: RedisClientType | null = null;
async function getLocalClient(): Promise<RedisClientType> {
  if (!localClient) {
    localClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
    await localClient.connect();
  }
  return localClient;
}

const localKv: KvLike = {
  async get<T>(key: string) {
    const c = await getLocalClient();
    const v = await c.get(key);
    return v ? (JSON.parse(v) as T) : null;
  },
  async set(key, value, opts) {
    const c = await getLocalClient();
    const json = JSON.stringify(value);
    return opts?.ex ? c.setEx(key, opts.ex, json) : c.set(key, json);
  },
};

export const kv: KvLike = isProd ? (vercelKv as unknown as KvLike) : localKv;
