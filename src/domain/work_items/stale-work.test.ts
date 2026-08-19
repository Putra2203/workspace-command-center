import { describe, it, expect } from 'vitest';
import { detectStaleAndBlockedWork } from './stale-work';

describe('detectStaleAndBlockedWork', () => {
  const now = new Date('2026-08-19T10:00:00Z');
  const fifteenDaysAgo = new Date('2026-08-04T10:00:00Z').toISOString();
  const twoDaysAgo = new Date('2026-08-17T10:00:00Z').toISOString();

  const states = [
    { id: 'state-1', name: 'In Progress', group: 'started' },
    { id: 'state-2', name: 'Blocked', group: 'blocked' },
    { id: 'state-3', name: 'Done', group: 'completed' },
  ];

  it('detects stale tasks (>14 days inactive)', () => {
    const issues = [
      { id: 'i1', name: 'Old Task', state: 'state-1', updated_at: fifteenDaysAgo },
      { id: 'i2', name: 'Recent Task', state: 'state-1', updated_at: twoDaysAgo },
    ];

    const results = detectStaleAndBlockedWork(issues, states, 14, now);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('i1');
    expect(results[0].reason).toBe('stale');
  });

  it('detects blocked tasks', () => {
    const issues = [
      { id: 'i1', name: 'Stuck Task', state: 'state-2', updated_at: twoDaysAgo },
    ];

    const results = detectStaleAndBlockedWork(issues, states, 14, now);
    expect(results.length).toBe(1);
    expect(results[0].reason).toBe('blocked');
  });

  it('detects unassigned urgent tasks', () => {
    const issues = [
      { id: 'i1', name: 'Urgent Task', state: 'state-1', priority: 'urgent', assignees: [], updated_at: twoDaysAgo },
    ];

    const results = detectStaleAndBlockedWork(issues, states, 14, now);
    expect(results.length).toBe(1);
    expect(results[0].reason).toBe('unassigned_urgent');
  });

  it('ignores completed tasks even if old', () => {
    const issues = [
      { id: 'i1', name: 'Done Task', state: 'state-3', updated_at: fifteenDaysAgo },
    ];

    const results = detectStaleAndBlockedWork(issues, states, 14, now);
    expect(results.length).toBe(0);
  });
});
