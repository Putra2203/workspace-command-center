import { describe, it, expect } from 'vitest';
import { scoreTask } from './scoring';

const TODAY = new Date('2026-08-19T00:00:00Z');

describe('scoreTask', () => {
  it('scores an overdue, high-priority, blocking task higher than a low-priority task with no due date', () => {
    // Mirrors the PRD's testing.md sample test case (docs/Erdavid-Work-OS-Full-Implementation-Plan.md).
    const overdueHighPriorityBlocker = {
      dueDate: '2026-08-10', // 9 days overdue relative to TODAY
      priority: 'high',
      blockerCount: 2,
    };
    const lowPriorityNoDueDate = {
      dueDate: null,
      priority: 'low',
      blockerCount: 0,
    };

    expect(scoreTask(overdueHighPriorityBlocker, TODAY)).toBeGreaterThan(
      scoreTask(lowPriorityNoDueDate, TODAY)
    );
  });

  it('scores higher priority above lower priority, all else equal', () => {
    expect(scoreTask({ priority: 'urgent' }, TODAY)).toBeGreaterThan(scoreTask({ priority: 'low' }, TODAY));
    expect(scoreTask({ priority: 'high' }, TODAY)).toBeGreaterThan(scoreTask({ priority: 'medium' }, TODAY));
  });

  it('scores a due-today task higher than a task due next week', () => {
    const dueToday = { priority: 'medium', dueDate: '2026-08-19' };
    const dueNextWeek = { priority: 'medium', dueDate: '2026-08-26' };
    expect(scoreTask(dueToday, TODAY)).toBeGreaterThan(scoreTask(dueNextWeek, TODAY));
  });

  it('scores more-overdue higher than less-overdue', () => {
    const overdueByTenDays = { priority: 'medium', dueDate: '2026-08-09' };
    const overdueByOneDay = { priority: 'medium', dueDate: '2026-08-18' };
    expect(scoreTask(overdueByTenDays, TODAY)).toBeGreaterThan(scoreTask(overdueByOneDay, TODAY));
  });

  it('treats a task with no due date as having zero urgency contribution', () => {
    const noDueDate = { priority: 'medium' };
    const farFuture = { priority: 'medium', dueDate: '2027-01-01' };
    expect(scoreTask(noDueDate, TODAY)).toBe(scoreTask(farFuture, TODAY));
  });

  it('each additional blocked task increases the score', () => {
    const blocksTwo = { priority: 'medium', blockerCount: 2 };
    const blocksNone = { priority: 'medium', blockerCount: 0 };
    expect(scoreTask(blocksTwo, TODAY)).toBeGreaterThan(scoreTask(blocksNone, TODAY));
  });

  it('is deterministic and side-effect free', () => {
    const task = { priority: 'high', dueDate: '2026-08-15', blockerCount: 1 };
    expect(scoreTask(task, TODAY)).toBe(scoreTask(task, TODAY));
  });
});
