import { describe, it, expect } from 'vitest';
import { filterUnassignedTickets } from './ticket-pool';

describe('filterUnassignedTickets', () => {
  const states = [
    { id: 's1', name: 'Backlog', group: 'unstarted' },
    { id: 's2', name: 'Done', group: 'completed' },
  ];

  it('filters unassigned active tasks across projects', () => {
    const issues = [
      { id: 'i1', name: 'Open Ticket 1', state: 's1', assignees: [] },
      { id: 'i2', name: 'Assigned Ticket', state: 's1', assignees: ['user-1'] },
      { id: 'i3', name: 'Done Ticket', state: 's2', assignees: [] },
    ];

    const results = filterUnassignedTickets(issues, states);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('i1');
  });

  it('returns empty array when all issues are assigned', () => {
    const issues = [
      { id: 'i1', name: 'Task', state: 's1', assignees: ['user-1'] },
    ];
    expect(filterUnassignedTickets(issues, states)).toEqual([]);
  });
});
