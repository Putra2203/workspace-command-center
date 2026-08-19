import { describe, expect, it } from 'vitest';
import { classifyIntentTier, selectModelForTier } from './router';

describe('classifyIntentTier', () => {
  it('classifies read-only deterministic intents as none', () => {
    expect(classifyIntentTier('list_projects')).toBe('none');
    expect(classifyIntentTier('list_issues')).toBe('none');
    expect(classifyIntentTier('get_issue')).toBe('none');
    expect(classifyIntentTier('help')).toBe('none');
  });

  it('classifies conversational and light queries as light', () => {
    expect(classifyIntentTier('chat')).toBe('light');
    expect(classifyIntentTier('search')).toBe('light');
    expect(classifyIntentTier('categorize')).toBe('light');
    expect(classifyIntentTier('unknown')).toBe('light');
  });

  it('classifies mutating and generative intents as heavy', () => {
    expect(classifyIntentTier('create_issue')).toBe('heavy');
    expect(classifyIntentTier('update_issue')).toBe('heavy');
    expect(classifyIntentTier('batch_create_issues')).toBe('heavy');
    expect(classifyIntentTier('bulk_update')).toBe('heavy');
    expect(classifyIntentTier('decompose')).toBe('heavy');
    expect(classifyIntentTier('plan')).toBe('heavy');
    expect(classifyIntentTier('summarize')).toBe('heavy');
  });
});

describe('selectModelForTier', () => {
  it('returns flash for heavy tier', () => {
    expect(selectModelForTier('heavy')).toBe('gemini-2.5-flash');
  });

  it('returns flash-lite for light tier', () => {
    expect(selectModelForTier('light')).toBe('gemini-2.5-flash-lite');
  });
});
