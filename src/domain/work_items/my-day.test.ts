import { describe, it, expect } from 'vitest';
import { computeMyDayBuckets, filterOverdueIssues, filterBlockedIssues, type PlaneStateLike, type WorkItemLike } from './my-day';

const TODAY = '2026-08-19';
const ME = 'user-1';
const OTHER = 'user-2';

const states: PlaneStateLike[] = [
  { id: 'state-todo', name: 'Todo', group: 'unstarted' },
  { id: 'state-progress', name: 'In Progress', group: 'started' },
  { id: 'state-blocked', name: 'Blocked', group: 'started' },
  { id: 'state-done', name: 'Done', group: 'completed' },
  { id: 'state-cancelled', name: 'Cancelled', group: 'cancelled' },
];

function issue(overrides: Partial<WorkItemLike>): WorkItemLike {
  return { id: 'issue-1', assignees: [ME], ...overrides };
}

describe('computeMyDayBuckets', () => {
  it('resolves state from a bare state UUID against the states list (not state_detail)', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-done' })],
      states,
      ME,
      TODAY
    );
    // Done issue with no target_date: not active, not in any bucket.
    expect(result.metrics.active).toBe(0);
  });

  it('counts a non-done issue as active', () => {
    const result = computeMyDayBuckets([issue({ id: 'i1', state: 'state-todo' })], states, ME, TODAY);
    expect(result.metrics.active).toBe(1);
  });

  it('does not count a completed or cancelled issue as active', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-done' }), issue({ id: 'i2', state: 'state-cancelled' })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.active).toBe(0);
  });

  it('buckets an issue due today', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-todo', target_date: `${TODAY}T00:00:00Z` })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.dueToday).toBe(1);
    expect(result.dueTodayIssues.map(i => i.id)).toEqual(['i1']);
  });

  it('buckets a past-due, not-yet-done issue as overdue', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-todo', target_date: '2026-08-01' })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.overdue).toBe(1);
  });

  it('does not count a past-due but already-done issue as overdue', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-done', target_date: '2026-08-01' })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.overdue).toBe(0);
  });

  it('flags an issue in a "Blocked"-named state as blocked', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-blocked' })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.blocked).toBe(1);
    expect(result.blockedIssues.map(i => i.id)).toEqual(['i1']);
  });

  it('excludes issues not assigned to the current user', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', assignees: [OTHER], state: 'state-todo' })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.active).toBe(0);
  });

  it('returns all-zero metrics when currentUserId is null (fail closed)', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'state-blocked', target_date: TODAY })],
      states,
      null,
      TODAY
    );
    expect(result.metrics).toEqual({ active: 0, dueToday: 0, overdue: 0, blocked: 0 });
  });

  it('falls back to state_detail when no matching state UUID is found', () => {
    const result = computeMyDayBuckets(
      [issue({ id: 'i1', state: 'unknown-uuid', state_detail: { name: 'Blocked', group: 'started' } })],
      states,
      ME,
      TODAY
    );
    expect(result.metrics.blocked).toBe(1);
  });
});

describe('filterOverdueIssues (project-wide, no assignee scoping)', () => {
  it('includes a past-due, not-done issue regardless of assignee', () => {
    const result = filterOverdueIssues(
      [issue({ id: 'i1', assignees: [OTHER], state: 'state-todo', target_date: '2026-08-01' })],
      states,
      TODAY
    );
    expect(result.map(i => i.id)).toEqual(['i1']);
  });

  it('excludes a done issue even if its due date has passed', () => {
    const result = filterOverdueIssues(
      [issue({ id: 'i1', state: 'state-done', target_date: '2026-08-01' })],
      states,
      TODAY
    );
    expect(result).toEqual([]);
  });

  it('excludes an issue with no due date at all', () => {
    const result = filterOverdueIssues([issue({ id: 'i1', state: 'state-todo' })], states, TODAY);
    expect(result).toEqual([]);
  });
});

describe('filterBlockedIssues (project-wide, no assignee scoping)', () => {
  it('includes a blocked issue regardless of assignee', () => {
    const result = filterBlockedIssues(
      [issue({ id: 'i1', assignees: [OTHER], state: 'state-blocked' })],
      states
    );
    expect(result.map(i => i.id)).toEqual(['i1']);
  });

  it('excludes an issue in a non-blocked state', () => {
    const result = filterBlockedIssues([issue({ id: 'i1', state: 'state-todo' })], states);
    expect(result).toEqual([]);
  });
});
