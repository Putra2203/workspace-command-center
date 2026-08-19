export interface ScorableTask {
  /** ISO date string (e.g. Plane's target_date), or null/undefined if unset */
  dueDate?: string | null;
  priority?: string | null;
  /** How many other issues this one blocks — resolving it unblocks that many */
  blockerCount?: number;
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 8,
  high: 6,
  medium: 4,
  low: 2,
  none: 0,
};

function priorityWeight(priority?: string | null): number {
  if (!priority) return 0;
  return PRIORITY_WEIGHTS[priority.toLowerCase()] ?? 0;
}

/**
 * Due-today scores 10; each day overdue adds 1 (unbounded — the longer
 * overdue, the more urgent); each day in the future subtracts 1, floored
 * at 0 (a due date ten+ days out contributes no urgency).
 */
function urgencyScore(dueDate?: string | null, today: Date = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;

  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.round((dueDay - todayDay) / 86_400_000);

  if (diffDays <= 0) return 10 - diffDays; // due today = 10; overdue grows from there
  return Math.max(0, 10 - diffDays);
}

/**
 * Combines urgency (due-date proximity), priority, and blocker count into
 * one comparable score — higher means "work on this sooner". Pure and
 * deterministic; `today` is injectable for testing.
 */
export function scoreTask(task: ScorableTask, today: Date = new Date()): number {
  return priorityWeight(task.priority) + urgencyScore(task.dueDate, today) + (task.blockerCount ?? 0) * 3;
}
