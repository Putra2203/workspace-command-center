import { PlaneStateLike, WorkItemLike } from './my-day';

export interface TicketPoolIssue extends WorkItemLike {
  name?: string;
  title?: string;
  sequence_id?: number;
  priority?: string;
  project_detail?: { identifier: string };
}

/**
 * Filters tasks across projects that have no assignee (unassigned ticket pool).
 * Ignores completed or cancelled tasks.
 */
export function filterUnassignedTickets<T extends TicketPoolIssue>(
  issues: T[],
  states?: PlaneStateLike[]
): T[] {
  if (!issues || issues.length === 0) return [];

  const stateGroupMap = new Map<string, string>();
  const stateNameMap = new Map<string, string>();
  if (states) {
    for (const s of states) {
      if (s.id) {
        stateGroupMap.set(s.id, s.group?.toLowerCase() || s.name.toLowerCase());
        stateNameMap.set(s.id, s.name.toLowerCase());
      }
    }
  }

  return issues.filter(issue => {
    // Check if unassigned
    const isUnassigned = !issue.assignees || issue.assignees.length === 0;
    if (!isUnassigned) return false;

    // Check if not completed
    const stateStr = typeof issue.state === 'string' ? issue.state : '';
    const stateGroup = (stateStr ? stateGroupMap.get(stateStr) : '') || '';
    const stateName = (stateStr ? stateNameMap.get(stateStr) : '') || stateStr.toLowerCase();

    const isCompleted = stateGroup === 'completed' || stateGroup === 'cancelled' || stateName === 'done' || stateName === 'cancelled';
    return !isCompleted;
  });
}
