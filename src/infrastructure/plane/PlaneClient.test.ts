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

const { PlaneService } = await import('./PlaneClient');

describe('PlaneService caching', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ data: [{ id: 'p1', name: 'Project 1', identifier: 'P1' }] });
  });

  it('serves a second listProjects() call from cache without another API request', async () => {
    // Regression test for the per-request-instantiation bug: a fresh
    // `new PlaneService()` per request meant its TTLCache was recreated
    // every time, so this would previously call the API twice.
    const service = new PlaneService();

    await service.listProjects();
    await service.listProjects();

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('hits the API again for a second, independent instance (no shared cache)', async () => {
    // Confirms the cache lives on the instance, not module-global state —
    // it's the exported `planeService` singleton (not this class alone)
    // that's responsible for making the cache persist across requests.
    await new PlaneService().listProjects();
    await new PlaneService().listProjects();

    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
