import { describe, it, expect } from 'vitest';
import { parseIntent, buildActionPlanFromIntent } from './intent-engine';

describe('parseIntent (regex fallback engine)', () => {
  it('detects list_issues from an Indonesian phrase', () => {
    const result = parseIntent('Tampilkan semua task');
    expect(result.intent).toBe('list_issues');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects list_projects', () => {
    const result = parseIntent('list projects');
    expect(result.intent).toBe('list_projects');
  });

  it('detects help', () => {
    const result = parseIntent('bantuan');
    expect(result.intent).toBe('help');
  });

  it('extracts a project key and creates a single issue from a creation phrase', () => {
    const result = parseIntent('buat task fix login bug di PROJECT1');
    expect(result.intent).toBe('create_issue');
    expect(result.entities.projectKey).toBe('PROJECT1');
    expect(result.entities.title).toBeTruthy();
  });

  it('detects batch_create_issues from a numbered list', () => {
    const result = parseIntent('buat 3 task di PROJECT1: 1. Fix bug 2. Update UI 3. Test API');
    expect(result.intent).toBe('batch_create_issues');
    expect(result.entities.projectKey).toBe('PROJECT1');
    expect(result.entities.titles).toEqual(['Fix bug', 'Update UI', 'Test API']);
  });

  it('extracts an issue key from a project-issue-number pattern', () => {
    const result = parseIntent('PROJECT1-31');
    expect(result.entities.issueKey).toBe('PROJECT1-31');
    expect(result.entities.projectKey).toBe('PROJECT1');
  });

  it('extracts Indonesian priority keywords (tinggi -> high)', () => {
    const result = parseIntent('set priority tinggi untuk task ini');
    expect(result.entities.priority).toBe('high');
  });

  it('returns unknown with zero confidence for unrecognized gibberish', () => {
    const result = parseIntent('xyzxyzxyz random gibberish 12345');
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('falls back to get_issue when an issue key is present but no known pattern matches', () => {
    const result = parseIntent('pindahkan task PROJECT1-31 ke Done');
    expect(result.intent).toBe('get_issue');
    expect(result.entities.issueKey).toBe('PROJECT1-31');
    expect(result.entities.state).toBe('done');
  });
});

describe('buildActionPlanFromIntent', () => {
  it('builds a valid ActionPlan for single create_issue', () => {
    const intentResult = parseIntent('buat task fix login bug di PROJ1');
    const plan = buildActionPlanFromIntent(intentResult);
    expect(plan).not.toBeNull();
    expect(plan?.intent).toBe('create_issue');
    expect(plan?.requiresApproval).toBe(true);
    expect(plan?.steps.length).toBe(1);
    expect(plan?.steps[0].operation).toBe('createIssue');
  });

  it('builds a valid ActionPlan for batch_create_issues', () => {
    const intentResult = parseIntent('buat 3 task di PROJ1: 1. Fix bug 2. Update UI 3. Test API');
    const plan = buildActionPlanFromIntent(intentResult);
    expect(plan).not.toBeNull();
    expect(plan?.intent).toBe('batch_create_issues');
    expect(plan?.steps.length).toBe(3);
    expect(plan?.risk).toBe('medium');
  });

  it('returns null for read-only intents', () => {
    const intentResult = parseIntent('tampilkan semua task');
    const plan = buildActionPlanFromIntent(intentResult);
    expect(plan).toBeNull();
  });
});
