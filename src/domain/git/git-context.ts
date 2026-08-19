export interface GitBranchSuggestion {
  branchName: string;
  commitPrefix: string;
}

/**
 * Generates standardized Git branch names and commit message prefixes for a Plane issue.
 */
export function generateGitBranchSuggestion(
  issueKey: string,
  title: string,
  type: 'feature' | 'bugfix' | 'chore' = 'feature'
): GitBranchSuggestion {
  const cleanKey = issueKey.trim().toUpperCase();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);

  const branchName = `${type}/${cleanKey}-${slug}`;
  const commitPrefix = `[${cleanKey}]`;

  return {
    branchName,
    commitPrefix,
  };
}
