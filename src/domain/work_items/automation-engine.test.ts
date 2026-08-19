import { describe, it, expect } from 'vitest';
import { evaluateAutomationRules, RuleDefinition } from './automation-engine';

describe('evaluateAutomationRules', () => {
  const rules: RuleDefinition[] = [
    {
      id: 'r1',
      name: 'Escalate overdue tasks',
      trigger: 'on_overdue',
      action: 'set_priority_urgent',
      enabled: true,
    },
  ];

  it('evaluates on_overdue trigger and generates action step', () => {
    const now = new Date('2026-08-19T10:00:00Z');
    const issues = [
      { id: '1', sequence_id: 12, target_date: '2026-08-01', priority: 'medium' },
      { id: '2', sequence_id: 13, target_date: '2026-08-25', priority: 'medium' },
    ];

    const result = evaluateAutomationRules(issues, rules, 'PROJ1', now);
    expect(result.steps.length).toBe(1);
    expect(result.steps[0].target).toBe('PROJ1-12');
    expect(result.steps[0].changes.priority).toBe('urgent');
  });

  it('skips disabled rules', () => {
    const disabledRules: RuleDefinition[] = [{ ...rules[0], enabled: false }];
    const issues = [{ id: '1', sequence_id: 12, target_date: '2026-08-01', priority: 'medium' }];

    const result = evaluateAutomationRules(issues, disabledRules, 'PROJ1');
    expect(result.steps.length).toBe(0);
  });
});
