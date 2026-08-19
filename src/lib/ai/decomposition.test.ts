import { describe, it, expect } from 'vitest';
import { decomposeFeatureToSubtasks } from './decomposition';

describe('decomposeFeatureToSubtasks', () => {
  it('decomposes a prompt into subtasks using smart fallback when no API key present', async () => {
    const subtasks = await decomposeFeatureToSubtasks('pecah feature User Profile UI', 'PROJ1');
    expect(subtasks.length).toBeGreaterThanOrEqual(3);
    expect(subtasks[0].title).toContain('User Profile UI');
    expect(subtasks[0].priority).toBe('high');
  });
});
