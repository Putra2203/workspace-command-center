import { describe, it, expect } from 'vitest';
import { categorizeCycles, calculateCycleProgress, formatCycleDate } from './cycles-helper';

describe('formatCycleDate', () => {
  it('formats raw ISO date strings into readable Indonesian short dates', () => {
    const formatted = formatCycleDate('2026-08-16T06:27:33.093652Z');
    expect(formatted).toContain('2026');
    expect(formatted).not.toContain('T06:27');
  });
});

describe('categorizeCycles', () => {
  it('correctly categorizes active, upcoming, and completed cycles', () => {
    const now = new Date('2026-08-19T00:00:00Z');
    const cycles = [
      { id: 'c1', name: 'Active Cycle', start_date: '2026-08-10', end_date: '2026-08-25' },
      { id: 'c2', name: 'Future Cycle', start_date: '2026-09-01', end_date: '2026-09-15' },
      { id: 'c3', name: 'Past Cycle', start_date: '2026-07-01', end_date: '2026-07-15' },
    ];

    const result = categorizeCycles(cycles, now);
    expect(result.active.length).toBe(1);
    expect(result.active[0].id).toBe('c1');
    expect(result.upcoming.length).toBe(1);
    expect(result.upcoming[0].id).toBe('c2');
    expect(result.completed.length).toBe(1);
    expect(result.completed[0].id).toBe('c3');
  });
});

describe('calculateCycleProgress', () => {
  it('calculates completed vs total percentage correctly', () => {
    const states = [
      { id: 's1', name: 'In Progress', group: 'unstarted' },
      { id: 's2', name: 'Done', group: 'completed' },
    ];
    const issues = [
      { id: 'i1', state: 's1' },
      { id: 'i2', state: 's2' },
    ];

    const res = calculateCycleProgress(issues, states);
    expect(res.total).toBe(2);
    expect(res.completed).toBe(1);
    expect(res.percentage).toBe(50);
  });

  it('filters issues by projectIdentifier when provided', () => {
    const states = [{ id: 's2', name: 'Done', group: 'completed' }];
    const issues = [
      { id: 'i1', state: 's2', project_detail: { identifier: 'PROJ1' } },
      { id: 'i2', state: 's2', project_detail: { identifier: 'PROJ2' } },
    ];

    const res = calculateCycleProgress(issues, states, 'PROJ1');
    expect(res.total).toBe(1);
    expect(res.completed).toBe(1);
  });
});
