import { describe, it, expect } from 'vitest';
import { ActionPlanSchema } from './schemas';

describe('ActionPlanSchema', () => {
  it('accepts a valid ActionPlan', () => {
    const valid = {
      id: 'plan-1',
      intent: 'bulk_update',
      summary: 'Set 3 overdue tasks to current cycle, high priority',
      risk: 'low',
      requiresApproval: true,
      steps: [
        {
          operation: 'updateIssue',
          target: 'ISSUE-1',
          changes: { cycle: 'Current', priority: 'High' },
        },
      ],
    };

    const result = ActionPlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid ActionPlan', () => {
    const invalid = {
      id: 'plan-2',
      intent: 'bulk_update',
      summary: 'Missing risk and requiresApproval, bad step',
      steps: [
        {
          operation: 'updateIssue',
          // missing required `target`
          changes: { priority: 'High' },
        },
      ],
    };

    const result = ActionPlanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
