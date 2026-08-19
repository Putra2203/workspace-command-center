import { describe, it, expect } from 'vitest';
import { getNextFocusTask } from './focus-queue';

describe('getNextFocusTask', () => {
  const states = [
    { id: 's1', name: 'Todo', group: 'unstarted' },
    { id: 's2', name: 'Done', group: 'completed' },
  ];

  it('selects the highest-scored active task for the user', () => {
    const issues = [
      { id: '1', name: 'Low Prio Task', state: 's1', priority: 'low', assignees: ['u1'] },
      { id: '2', name: 'Urgent Task', state: 's1', priority: 'urgent', target_date: '2020-01-01', assignees: ['u1'] },
      { id: '3', name: 'Completed Task', state: 's2', priority: 'urgent', assignees: ['u1'] },
    ];

    const next = getNextFocusTask(issues, states, 'u1');
    expect(next?.id).toBe('2');
  });

  it('returns null if there are no active tasks assigned to the user', () => {
    const issues = [
      { id: '1', name: 'Done Task', state: 's2', assignees: ['u1'] },
    ];

    const next = getNextFocusTask(issues, states, 'u1');
    expect(next).toBeNull();
  });
});
