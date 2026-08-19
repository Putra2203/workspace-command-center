import * as fuzz from 'fuzzball';

export interface DuplicateCandidate {
  id: string;
  key?: string;
  title: string;
  similarity: number; // 0 to 100
}

/**
 * Finds existing issues in a project that are near-duplicates of a proposed title.
 */
export function findSimilarIssues(
  newTitle: string,
  existingIssues: Array<{ id: string; name?: string; title?: string; sequence_id?: number }>,
  threshold: number = 65
): DuplicateCandidate[] {
  if (!newTitle || !existingIssues || existingIssues.length === 0) {
    return [];
  }

  const normalizedNew = newTitle.trim().toLowerCase();
  const candidates: DuplicateCandidate[] = [];

  for (const issue of existingIssues) {
    const existingTitle = (issue.name || issue.title || '').trim().toLowerCase();
    if (!existingTitle) continue;

    // Direct match or high fuzzy ratio / token set ratio
    const ratioScore = fuzz.ratio(normalizedNew, existingTitle);
    const tokenSetScore = fuzz.token_set_ratio(normalizedNew, existingTitle);
    const similarity = Math.max(ratioScore, tokenSetScore);

    if (similarity >= threshold) {
      candidates.push({
        id: issue.id,
        key: issue.sequence_id ? `TASK-${issue.sequence_id}` : undefined,
        title: issue.name || issue.title || '',
        similarity,
      });
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity);
}
