import { describe, it, expect } from 'vitest';
import { calculateProjectHealth } from './analytics-helper';

describe('calculateProjectHealth', () => {
  it('handles empty issues list gracefully', () => {
    const health = calculateProjectHealth([]);
    expect(health.totalIssues).toBe(0);
    expect(health.completionRate).toBe(0);
    expect(health.healthScore).toBe(100);
    expect(health.healthStatus).toBe('Healthy');
  });

  it('calculates metrics, completion rate, and priority breakdown correctly', () => {
    const states = [
      { id: 's1', name: 'In Progress', group: 'started' },
      { id: 's2', name: 'Done', group: 'completed' },
    ];
    const issues = [
      { id: 'i1', state: 's1', priority: 'urgent', assignees: ['u1'] },
      { id: 'i2', state: 's2', priority: 'high', assignees: ['u1'] },
      { id: 'i3', state: 's2', priority: 'medium', assignees: [] },
    ];

    const health = calculateProjectHealth(issues, states, new Date('2026-08-19'));
    expect(health.totalIssues).toBe(3);
    expect(health.completedIssues).toBe(2);
    expect(health.inProgressIssues).toBe(1);
    expect(health.completionRate).toBe(67);
    expect(health.priorityBreakdown.urgent).toBe(1);
    expect(health.priorityBreakdown.high).toBe(1);
    expect(health.priorityBreakdown.medium).toBe(1);
    expect(health.unassignedCount).toBe(1);
  });

  it('flags overdue issues accurately', () => {
    const states = [{ id: 's1', name: 'In Progress', group: 'started' }];
    const issues = [
      { id: 'i1', state: 's1', target_date: '2026-08-10' }, // Overdue
      { id: 'i2', state: 's1', target_date: '2026-08-25' }, // Future
    ];

    const health = calculateProjectHealth(issues, states, new Date('2026-08-19'));
    expect(health.overdueCount).toBe(1);
    expect(health.healthScore).toBeLessThan(100);
  });
});
