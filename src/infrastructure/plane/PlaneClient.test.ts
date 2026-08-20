import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: getMock,
      interceptors: { response: { use: vi.fn() } },
    }),
  },
}));

// Fake Prisma backed by a plain Map, simulating the Supabase `query_cache`
// table shared across PlaneService instances — real persistence semantics,
// no real DB connection.
const fakeDb = new Map<string, { value: unknown; expiresAt: Date }>();

vi.mock('@/infrastructure/db/client', () => ({
  prisma: {
    queryCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = fakeDb.get(where.key);
        return row ? { key: where.key, ...row } : null;
      }),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: unknown; expiresAt: Date } }) => {
        fakeDb.set(where.key, { value: create.value, expiresAt: create.expiresAt });
      }),
      deleteMany: vi.fn(async ({ where }: { where: { key: string | { startsWith: string } } }) => {
        if (typeof where.key === 'string') {
          fakeDb.delete(where.key);
        } else {
          for (const k of fakeDb.keys()) {
            if (k.startsWith(where.key.startsWith)) fakeDb.delete(k);
          }
        }
      }),
    },
  },
}));

const { PlaneService } = await import('./PlaneClient');

describe('PlaneService caching', () => {
  beforeEach(() => {
    process.env.PLANE_WORKSPACE_SLUG = 'test-workspace';
    getMock.mockReset();
    getMock.mockResolvedValue({ data: [{ id: 'p1', name: 'Project 1', identifier: 'P1' }] });
    fakeDb.clear();
  });

  it('serves a second listProjects() call from cache without another API request', async () => {
    // Regression test for the per-request-instantiation bug: a fresh
    // `new PlaneService()` per request meant its cache was recreated every
    // time, so this would previously call the API twice.
    const service = new PlaneService();

    await service.listProjects();
    await service.listProjects();

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('shares the cache across independent instances via the persistent store (survives a cold start)', async () => {
    // This is the behavior P0-10 exists for: a fresh PlaneService (simulating
    // a new serverless invocation with an empty in-memory layer) still hits
    // the persistent store before the Plane API, if another instance already
    // cached the same key. Under the old pure in-memory TTLCache, two
    // independent instances would NOT have shared a cache — this is the
    // deliberate behavior change P0-10 introduces.
    await new PlaneService().listProjects();
    await new PlaneService().listProjects();

    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
