import { computeMyDayBuckets, PlaneStateLike, WorkItemLike } from './my-day';
import { scoreTask } from './scoring';

export interface FocusIssue extends WorkItemLike {
  name?: string;
  title?: string;
  sequence_id?: number;
  priority?: string;
}

/**
 * Returns the highest-priority active task for focus mode based on deterministic priority scoring.
 */
export function getNextFocusTask<T extends FocusIssue>(
  issues: T[],
  states: PlaneStateLike[],
  currentUserId: string | null
): T | null {
  const { activeIssues } = computeMyDayBuckets(issues, states, currentUserId);

  if (activeIssues.length === 0) {
    return null;
  }

  const scored = activeIssues
    .map(issue => ({
      issue,
      score: scoreTask({ dueDate: issue.target_date, priority: issue.priority }),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.issue || null;
}
