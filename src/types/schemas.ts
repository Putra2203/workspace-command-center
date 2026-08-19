import { z } from 'zod';

export const ActionStepSchema = z.object({
  operation: z.string(),
  target: z.string(),
  changes: z.record(z.string(), z.unknown()),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
});

export const ActionPlanSchema = z.object({
  id: z.string(),
  intent: z.string(),
  summary: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  requiresApproval: z.boolean(),
  steps: z.array(ActionStepSchema),
});
