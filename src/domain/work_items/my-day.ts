export interface PlaneStateLike {
  id?: string;
  name: string;
  group: string;
}

export interface WorkItemLike {
  id: string;
  target_date?: string;
  assignees?: string[];
  state?: unknown;
  state_detail?: { id?: string; name: string; group: string };
}

export interface MyDayMetrics {
  active: number;
  dueToday: number;
  overdue: number;
  blocked: number;
}

export interface MyDayBuckets<T extends WorkItemLike> {
  metrics: MyDayMetrics;
  dueTodayIssues: T[];
  overdueIssues: T[];
  blockedIssues: T[];
  /** Current user's not-done issues — the candidate pool for "Recommended Next Task" scoring */
  activeIssues: T[];
}

export function isDoneGroup(group?: string): boolean {
  return group === 'completed' || group === 'cancelled';
}

export function isBlockedState(state?: PlaneStateLike): boolean {
  return (state?.name || '').toLowerCase().includes('block');
}

export function buildStateMap(states: PlaneStateLike[]): Map<string, PlaneStateLike> {
  const map = new Map<string, PlaneStateLike>();
  for (const s of states) {
    if (s.id) map.set(s.id, s);
  }
  return map;
}

/**
 * Plane's issue list only returns a bare state UUID (or occasionally an
 * embedded object) — never a joined `state_detail` — so resolve it against
 * the separately-fetched `states` list, same as KanbanBoard does.
 */
export function resolveIssueState<T extends WorkItemLike>(
  issue: T,
  stateMap: Map<string, PlaneStateLike>
): PlaneStateLike | undefined {
  const stateId =
    typeof issue.state === 'string'
      ? issue.state
      : (issue.state as { id?: string } | undefined)?.id || issue.state_detail?.id;
  return (stateId ? stateMap.get(stateId) : undefined) || issue.state_detail;
}

/**
 * Project-wide overdue filter — no assignee scoping, unlike `computeMyDayBuckets`.
 * `today` defaults to the real date but can be overridden for deterministic testing.
 */
export function filterOverdueIssues<T extends WorkItemLike>(
  issues: T[],
  states: PlaneStateLike[],
  today: string = new Date().toISOString().slice(0, 10)
): T[] {
  const stateMap = buildStateMap(states);
  return issues.filter(issue => {
    if (!issue.target_date) return false;
    const state = resolveIssueState(issue, stateMap);
    if (isDoneGroup(state?.group)) return false;
    return issue.target_date.slice(0, 10) < today;
  });
}

/** Project-wide blocked filter — no assignee scoping, unlike `computeMyDayBuckets`. */
export function filterBlockedIssues<T extends WorkItemLike>(issues: T[], states: PlaneStateLike[]): T[] {
  const stateMap = buildStateMap(states);
  return issues.filter(issue => isBlockedState(resolveIssueState(issue, stateMap)));
}

/**
 * `today` defaults to the real date but can be overridden for deterministic
 * testing — a 'YYYY-MM-DD' string, matching Plane's `target_date` format.
 */
export function computeMyDayBuckets<T extends WorkItemLike>(
  issues: T[],
  states: PlaneStateLike[],
  currentUserId: string | null,
  today: string = new Date().toISOString().slice(0, 10)
): MyDayBuckets<T> {
  const stateMap = buildStateMap(states);
  const myIssues = currentUserId ? issues.filter(i => i.assignees?.includes(currentUserId)) : [];

  const overdueIssues = filterOverdueIssues(myIssues, states, today);
  const blockedIssues = filterBlockedIssues(myIssues, states);
  const dueTodayIssues: T[] = [];
  const activeIssues: T[] = [];

  for (const issue of myIssues) {
    const state = resolveIssueState(issue, stateMap);
    const done = isDoneGroup(state?.group);
    if (!done) activeIssues.push(issue);

    if (issue.target_date && issue.target_date.slice(0, 10) === today) {
      dueTodayIssues.push(issue);
    }
  }

  return {
    metrics: {
      active: activeIssues.length,
      dueToday: dueTodayIssues.length,
      overdue: overdueIssues.length,
      blocked: blockedIssues.length,
    },
    dueTodayIssues,
    overdueIssues,
    blockedIssues,
    activeIssues,
  };
}
