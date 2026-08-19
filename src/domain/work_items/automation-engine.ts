import { ActionStep } from '@/types/ai';

export interface RuleDefinition {
  id: string;
  name: string;
  trigger: 'on_overdue' | 'on_unassigned_high_priority' | string;
  action: 'set_priority_urgent' | 'set_priority_high' | 'move_to_done' | string;
  enabled: boolean;
}

/**
 * Evaluates active automation rules against a list of workspace issues
 * and returns proposed ActionSteps.
 */
export function evaluateAutomationRules(
  issues: Array<{
    id: string;
    sequence_id?: number;
    title?: string;
    name?: string;
    target_date?: string;
    priority?: string;
    assignees?: string[];
    state?: any;
  }>,
  rules: RuleDefinition[],
  projectKey: string = 'PROJECT',
  nowDate: Date = new Date()
): { evaluatedRuleCount: number; steps: ActionStep[] } {
  const activeRules = rules.filter(r => r.enabled);
  if (!issues || issues.length === 0 || activeRules.length === 0) {
    return { evaluatedRuleCount: activeRules.length, steps: [] };
  }

  const steps: ActionStep[] = [];
  const todayStr = nowDate.toISOString().slice(0, 10);

  for (const rule of activeRules) {
    if (rule.trigger === 'on_overdue') {
      for (const issue of issues) {
        if (issue.target_date && issue.target_date < todayStr && issue.priority !== 'urgent') {
          if (rule.action === 'set_priority_urgent') {
            steps.push({
              operation: 'updateIssue',
              target: issue.sequence_id ? `${projectKey}-${issue.sequence_id}` : issue.id,
              changes: { priority: 'urgent' },
              before: { priority: issue.priority || 'none' },
              after: { priority: 'urgent' },
            });
          }
        }
      }
    } else if (rule.trigger === 'on_unassigned_high_priority') {
      for (const issue of issues) {
        if (
          (!issue.assignees || issue.assignees.length === 0) &&
          (issue.priority === 'high' || issue.priority === 'urgent')
        ) {
          if (rule.action === 'set_priority_urgent') {
            steps.push({
              operation: 'updateIssue',
              target: issue.sequence_id ? `${projectKey}-${issue.sequence_id}` : issue.id,
              changes: { priority: 'urgent' },
              before: { priority: issue.priority },
              after: { priority: 'urgent' },
            });
          }
        }
      }
    }
  }

  return { evaluatedRuleCount: activeRules.length, steps };
}
