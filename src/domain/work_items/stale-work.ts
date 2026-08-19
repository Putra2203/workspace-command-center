export interface StaleOrBlockedIssue {
  id: string;
  title: string;
  reason: 'stale' | 'blocked' | 'unassigned_urgent';
  daysInactive?: number;
  state?: string;
  priority?: string;
}

/**
 * Deterministically identifies stale tasks (> 14 days inactive) and blocked / unassigned urgent tasks.
 */
export function detectStaleAndBlockedWork(
  issues: Array<{
    id: string;
    name?: string;
    title?: string;
    state?: string | unknown;
    priority?: string;
    assignees?: string[];
    updated_at?: string;
  }>,
  states?: Array<{ id?: string; name: string; group?: string }>,
  staleThresholdDays: number = 14,
  nowDate: Date = new Date()
): StaleOrBlockedIssue[] {
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

  const results: StaleOrBlockedIssue[] = [];

  for (const issue of issues) {
    const title = issue.name || issue.title || 'Untitled Issue';
    const stateStr = typeof issue.state === 'string' ? issue.state : '';
    const stateGroup = (stateStr ? stateGroupMap.get(stateStr) : '') || '';
    const stateName = (stateStr ? stateNameMap.get(stateStr) : '') || stateStr.toLowerCase();

    const isCompleted = stateGroup === 'completed' || stateGroup === 'cancelled' || stateName === 'done' || stateName === 'cancelled';
    if (isCompleted) continue;

    // Check for explicit blocked state
    const isBlocked = stateGroup === 'blocked' || stateName.includes('blocked') || stateName.includes('terhambat');
    if (isBlocked) {
      results.push({
        id: issue.id,
        title,
        reason: 'blocked',
        state: stateName,
        priority: issue.priority,
      });
      continue;
    }

    // Check for unassigned urgent issue
    const isUrgent = issue.priority?.toLowerCase() === 'urgent';
    const isUnassigned = !issue.assignees || issue.assignees.length === 0;
    if (isUrgent && isUnassigned) {
      results.push({
        id: issue.id,
        title,
        reason: 'unassigned_urgent',
        priority: issue.priority,
      });
      continue;
    }

    // Check for stale work (> 14 days without update)
    if (issue.updated_at) {
      const updatedAt = new Date(issue.updated_at);
      const diffTime = Math.abs(nowDate.getTime() - updatedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= staleThresholdDays) {
        results.push({
          id: issue.id,
          title,
          reason: 'stale',
          daysInactive: diffDays,
          state: stateName,
          priority: issue.priority,
        });
      }
    }
  }

  return results;
}
