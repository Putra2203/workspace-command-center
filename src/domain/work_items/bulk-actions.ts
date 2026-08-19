import type { ActionPlan, ActionStep } from '@/types/ai';

export interface BulkPriorityTarget {
  id: string;
  key: string;
  title: string;
  priority: string;
}

/**
 * Builds a client-side ActionPlan for a bulk priority change — the first
 * place the ActionPlan preview UI is exercised, ahead of the AI flow
 * reusing the same types/schema in Phase 2.
 */
export function buildBulkPriorityActionPlan(issues: BulkPriorityTarget[], newPriority: string): ActionPlan {
  const steps: ActionStep[] = issues.map(issue => ({
    operation: 'updateIssue',
    target: issue.id,
    changes: { priority: newPriority },
    before: { priority: issue.priority },
    after: { priority: newPriority },
  }));

  return {
    id: `bulk-priority-${issues.map(i => i.id).join(',')}-${newPriority}`,
    intent: 'bulk_update',
    summary: `Set ${issues.length} issue${issues.length === 1 ? '' : 's'} to ${newPriority} priority`,
    risk: 'low',
    requiresApproval: true,
    steps,
  };
}
