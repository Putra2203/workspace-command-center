import { describe, it, expect, vi } from 'vitest';
import { InsightService } from './InsightService';
import type { PlaneService } from '@/infrastructure/plane/PlaneClient';
import type { PlaneIssue, PlaneState } from '@/types/plane';

const ME = 'user-1';

const states: PlaneState[] = [
  { id: 'state-todo', name: 'Todo', color: '#000', group: 'unstarted' },
  { id: 'state-done', name: 'Done', color: '#000', group: 'completed' },
  { id: 'state-blocked', name: 'Blocked', color: '#000', group: 'started' },
];

function fakePlaneService(issues: PlaneIssue[]): PlaneService {
  return {
    listIssues: vi.fn().mockResolvedValue(issues),
    listStates: vi.fn().mockResolvedValue(states),
  } as unknown as PlaneService;
}

function issue(overrides: Partial<PlaneIssue>): PlaneIssue {
  return { id: 'i1', name: 'Untitled', sequence_id: 1, assignees: [ME], ...overrides };
}

describe('InsightService.getDailyBriefing', () => {
  it('keeps summary null when no AI text generation is requested', async () => {
    const service = new InsightService(fakePlaneService([]));
    const briefing = await service.getDailyBriefing('proj-1', ME);
    expect(briefing.summary).toBeNull();
  });

  it('returns the same deterministic metrics shape as the My Day dashboard', async () => {
    const planeService = fakePlaneService([
      issue({ id: 'i1', state: 'state-todo' }),
      issue({ id: 'i2', state: 'state-blocked' }),
    ]);
    const service = new InsightService(planeService);
    const briefing = await service.getDailyBriefing('proj-1', ME);

    expect(briefing.metrics).toEqual({ active: 2, dueToday: 0, overdue: 0, blocked: 1 });
  });

  it('recommends overdue and due-today issues with a reason', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const planeService = fakePlaneService([
      issue({ id: 'overdue-1', state: 'state-todo', target_date: '2020-01-01' }),
      issue({ id: 'due-today-1', state: 'state-todo', target_date: today }),
      issue({ id: 'not-mine', assignees: ['someone-else'], state: 'state-todo', target_date: '2020-01-01' }),
    ]);
    const service = new InsightService(planeService);
    const briefing = await service.getDailyBriefing('proj-1', ME);

    expect(briefing.recommendations).toEqual([
      { taskId: 'overdue-1', reason: 'Overdue' },
      { taskId: 'due-today-1', reason: 'Due today' },
    ]);
  });

  it('fetches issues and states for the given project', async () => {
    const planeService = fakePlaneService([]);
    const service = new InsightService(planeService);
    await service.getDailyBriefing('proj-42', ME);

    expect(planeService.listIssues).toHaveBeenCalledWith('proj-42');
    expect(planeService.listStates).toHaveBeenCalledWith('proj-42');
  });
});

describe('InsightService.getWeeklyReview', () => {
  it('computes 7-day created and completed task metrics correctly', async () => {
    const now = new Date('2026-08-19T10:00:00Z');
    const threeDaysAgo = new Date('2026-08-16T10:00:00Z').toISOString();
    const tenDaysAgo = new Date('2026-08-09T10:00:00Z').toISOString();

    const planeService = fakePlaneService([
      issue({ id: 'i1', state: 'state-done', created_at: threeDaysAgo, updated_at: threeDaysAgo }),
      issue({ id: 'i2', state: 'state-todo', created_at: threeDaysAgo, updated_at: threeDaysAgo }),
      issue({ id: 'i3', state: 'state-done', created_at: tenDaysAgo, updated_at: tenDaysAgo }),
    ]);

    const service = new InsightService(planeService);
    const weekly = await service.getWeeklyReview('proj-1', ME, now);

    expect(weekly.metrics.created7Days).toBe(2);
    expect(weekly.metrics.completed7Days).toBe(1);
  });
});
