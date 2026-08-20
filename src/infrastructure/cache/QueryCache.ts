import { prisma } from '@/infrastructure/db/client';
import { Prisma } from '../../generated/prisma/client';

interface MemoryEntry<V> {
  value: V;
  expiry: number;
}

/**
 * Two-tier cache: an in-memory Map fronts a Supabase-backed `query_cache`
 * table. The in-memory layer keeps repeat calls within one warm process
 * fast (no DB round-trip); the table means cached values survive a cold
 * start / process restart, unlike the old pure in-memory TTLCache.
 */
export class QueryCache {
  private memory = new Map<string, MemoryEntry<unknown>>();

  constructor(private ttlMs: number) {}

  async get<V>(key: string): Promise<V | undefined> {
    const cached = this.memory.get(key);
    if (cached && Date.now() <= cached.expiry) {
      return cached.value as V;
    }
    this.memory.delete(key);

    const row = await prisma.queryCache.findUnique({ where: { key } });
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      return undefined;
    }

    const value = row.value as V;
    this.memory.set(key, { value, expiry: row.expiresAt.getTime() });
    return value;
  }

  async set<V>(key: string, value: V): Promise<void> {
    const expiry = Date.now() + this.ttlMs;
    this.memory.set(key, { value, expiry });

    await prisma.queryCache.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, expiresAt: new Date(expiry) },
      update: { value: value as Prisma.InputJsonValue, expiresAt: new Date(expiry) },
    });
  }

  async delete(key: string): Promise<void> {
    this.memory.delete(key);
    await prisma.queryCache.deleteMany({ where: { key } });
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
    await prisma.queryCache.deleteMany({ where: { key: { startsWith: prefix } } });
  }
}
