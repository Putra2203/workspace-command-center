import { PlaneCycle } from '@/types/plane';

export interface CategorizedCycles {
  active: PlaneCycle[];
  upcoming: PlaneCycle[];
  completed: PlaneCycle[];
}

/**
 * Formats ISO date strings into clean, readable date format (e.g. 16 Agt 2026).
 */
export function formatCycleDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Categorizes Plane cycles into active, upcoming, and completed lists based on date boundaries.
 */
export function categorizeCycles(cycles: PlaneCycle[], nowDate: Date = new Date()): CategorizedCycles {
  if (!cycles || cycles.length === 0) {
    return { active: [], upcoming: [], completed: [] };
  }

  const todayStr = nowDate.toISOString().slice(0, 10);
  const active: PlaneCycle[] = [];
  const upcoming: PlaneCycle[] = [];
  const completed: PlaneCycle[] = [];

  for (const cycle of cycles) {
    const start = cycle.start_date || '';
    const end = cycle.end_date || '';

    if (start && start > todayStr) {
      upcoming.push(cycle);
    } else if (end && end < todayStr) {
      completed.push(cycle);
    } else {
      active.push(cycle);
    }
  }

  return { active, upcoming, completed };
}

/**
 * Calculates progress metrics (total, completed, rate) for issues in a cycle.
 * Supports direct Plane API metrics on cycle object or issue list fallback.
 */
export function calculateCycleProgress(
  cycleOrIssues: any,
  issuesOrStates?: any,
  statesOrProjectId?: any,
  projectIdentifier?: string
): { total: number; completed: number; percentage: number } {
  // If first parameter is a cycle object with metrics directly from Plane API
  if (cycleOrIssues && typeof cycleOrIssues === 'object' && !Array.isArray(cycleOrIssues)) {
    const c = cycleOrIssues;
    if (typeof c.completed_issues === 'number' && typeof c.total_issues === 'number' && c.total_issues > 0) {
      const total = c.total_issues;
      const completed = c.completed_issues;
      const percentage = Math.round((completed / total) * 100);
      return { total, completed, percentage };
    }
  }

  // Fallback: calculate from issues array
  const issues = Array.isArray(cycleOrIssues) ? cycleOrIssues : (Array.isArray(issuesOrStates) ? issuesOrStates : []);
  const states = Array.isArray(issuesOrStates) && Array.isArray(cycleOrIssues) ? issuesOrStates : (Array.isArray(statesOrProjectId) ? statesOrProjectId : []);
  const targetProj = typeof statesOrProjectId === 'string' ? statesOrProjectId : projectIdentifier;

  if (!issues || issues.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  const filteredIssues = targetProj
    ? issues.filter((i: any) => i.project_detail?.identifier === targetProj)
    : issues;

  if (filteredIssues.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  const stateGroupMap = new Map<string, string>();
  if (states) {
    for (const s of states) {
      if (s?.id) {
        stateGroupMap.set(s.id, s.group?.toLowerCase() || s.name?.toLowerCase());
      }
    }
  }

  let completedCount = 0;
  for (const issue of filteredIssues) {
    const stateStr = typeof issue.state === 'string' ? issue.state : '';
    const group = (stateStr ? stateGroupMap.get(stateStr) : '') || stateStr.toLowerCase();
    if (group === 'completed' || group === 'done') {
      completedCount++;
    }
  }

  const total = filteredIssues.length;
  const percentage = Math.round((completedCount / total) * 100);

  return { total, completed: completedCount, percentage };
}
