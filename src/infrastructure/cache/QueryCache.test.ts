import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock('@/infrastructure/db/client', () => ({
  prisma: {
    queryCache: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
  },
}));

const { QueryCache } = await import('./QueryCache');

describe('QueryCache', () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    deleteManyMock.mockReset();
  });

  it('serves a repeat get() from the in-memory layer without querying the DB', async () => {
    const cache = new QueryCache(60_000);
    await cache.set('key1', { hello: 'world' });
    findUniqueMock.mockClear();

    const value = await cache.get('key1');

    expect(value).toEqual({ hello: 'world' });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('falls back to the persistent row when memory is empty (simulating a cold start)', async () => {
    findUniqueMock.mockResolvedValue({
      key: 'key1',
      value: { hello: 'world' },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const cache = new QueryCache(60_000);
    const value = await cache.get('key1');

    expect(value).toEqual({ hello: 'world' });
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { key: 'key1' } });
  });

  it('treats an expired persistent row as a cache miss', async () => {
    findUniqueMock.mockResolvedValue({
      key: 'key1',
      value: { hello: 'world' },
      expiresAt: new Date(Date.now() - 1_000),
    });

    const cache = new QueryCache(60_000);
    const value = await cache.get('key1');

    expect(value).toBeUndefined();
  });

  it('returns undefined for a key with no row at all', async () => {
    findUniqueMock.mockResolvedValue(null);

    const cache = new QueryCache(60_000);
    const value = await cache.get('missing-key');

    expect(value).toBeUndefined();
  });

  it('writes through to the DB on set()', async () => {
    const cache = new QueryCache(60_000);
    await cache.set('key1', { a: 1 });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'key1' },
        create: expect.objectContaining({ key: 'key1', value: { a: 1 } }),
        update: expect.objectContaining({ value: { a: 1 } }),
      })
    );
  });

  it('deletePrefix clears matching keys from memory and issues a prefix delete against the DB', async () => {
    const cache = new QueryCache(60_000);
    await cache.set('issues_slug_p1', ['x']);
    await cache.set('projects_slug', ['y']);

    await cache.deletePrefix('issues_');

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { key: { startsWith: 'issues_' } } });

    findUniqueMock.mockResolvedValue(null);
    expect(await cache.get('issues_slug_p1')).toBeUndefined();
  });
});
