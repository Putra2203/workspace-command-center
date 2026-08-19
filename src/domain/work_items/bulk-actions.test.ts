import { describe, it, expect } from 'vitest';
import { buildBulkPriorityActionPlan } from './bulk-actions';
import { ActionPlanSchema } from '@/types/schemas';

const issues = [
  { id: 'i1', key: 'PROJ-1', title: 'Fix login bug', priority: 'low' },
  { id: 'i2', key: 'PROJ-2', title: 'Update UI', priority: 'none' },
  { id: 'i3', key: 'PROJ-3', title: 'Test API', priority: 'medium' },
];

describe('buildBulkPriorityActionPlan', () => {
  it('builds one ActionStep per issue with the correct before/after diff', () => {
    const plan = buildBulkPriorityActionPlan(issues, 'high');

    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toEqual({
      operation: 'updateIssue',
      target: 'i1',
      changes: { priority: 'high' },
      before: { priority: 'low' },
      after: { priority: 'high' },
    });
    expect(plan.steps[1].before).toEqual({ priority: 'none' });
    expect(plan.steps[2].before).toEqual({ priority: 'medium' });
  });

  it('sets requiresApproval and a low risk for a priority-only change', () => {
    const plan = buildBulkPriorityActionPlan(issues, 'urgent');
    expect(plan.requiresApproval).toBe(true);
    expect(plan.risk).toBe('low');
  });

  it('summarizes the number of affected issues', () => {
    expect(buildBulkPriorityActionPlan(issues, 'high').summary).toBe('Set 3 issues to high priority');
    expect(buildBulkPriorityActionPlan([issues[0]], 'high').summary).toBe('Set 1 issue to high priority');
  });

  it('produces a plan that validates against ActionPlanSchema', () => {
    const plan = buildBulkPriorityActionPlan(issues, 'high');
    const result = ActionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it('produces a deterministic id for the same input', () => {
    const planA = buildBulkPriorityActionPlan(issues, 'high');
    const planB = buildBulkPriorityActionPlan(issues, 'high');
    expect(planA.id).toBe(planB.id);
  });
});
