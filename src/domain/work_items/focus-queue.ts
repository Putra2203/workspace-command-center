import { computeMyDayBuckets, PlaneStateLike, WorkItemLike } from './my-day';
import { scoreTask } from './scoring';

export interface FocusIssue extends WorkItemLike {
  name?: string;
  title?: string;
  sequence_id?: number;
  priority?: string;
  project_detail?: { identifier: string };
}

/**
 * Returns the top N active tasks for focus mode, ranked by deterministic priority scoring.
 */
export function getTopFocusTasks<T extends FocusIssue>(
  issues: T[],
  states: PlaneStateLike[],
  currentUserId: string | null,
  count: number = 3
): T[] {
  const { activeIssues } = computeMyDayBuckets(issues, states, currentUserId);

  if (activeIssues.length === 0) {
    return [];
  }

  return activeIssues
    .map(issue => ({
      issue,
      score: scoreTask({ dueDate: issue.target_date, priority: issue.priority }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ issue }) => issue);
}

/**
 * Returns the single highest-priority active task for focus mode.
 */
export function getNextFocusTask<T extends FocusIssue>(
  issues: T[],
  states: PlaneStateLike[],
  currentUserId: string | null
): T | null {
  return getTopFocusTasks(issues, states, currentUserId, 1)[0] || null;
}
