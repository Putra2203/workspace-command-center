import { describe, it, expect } from 'vitest';
import { generateGitBranchSuggestion } from './git-context';

describe('generateGitBranchSuggestion', () => {
  it('generates a clean git branch name and commit prefix', () => {
    const res = generateGitBranchSuggestion('PROJ1-31', 'Fix Login Authentication Error!');
    expect(res.branchName).toBe('feature/PROJ1-31-fix-login-authentication-error');
    expect(res.commitPrefix).toBe('[PROJ1-31]');
  });

  it('supports bugfix type', () => {
    const res = generateGitBranchSuggestion('PROJ1-42', 'API 500 Failure', 'bugfix');
    expect(res.branchName).toBe('bugfix/PROJ1-42-api-500-failure');
  });
});
