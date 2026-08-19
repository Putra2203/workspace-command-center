import { describe, it, expect } from 'vitest';
import { findSimilarIssues } from './duplicate-detection';

describe('findSimilarIssues', () => {
  const sampleIssues = [
    { id: '1', name: 'Fix Login Authentication Bug', sequence_id: 101 },
    { id: '2', name: 'Update Dashboard Analytics Charts', sequence_id: 102 },
    { id: '3', name: 'Refactor Plane Client Service', sequence_id: 103 },
  ];

  it('detects an exact or high-similarity title', () => {
    const results = findSimilarIssues('Fix Login Auth Bug', sampleIssues, 60);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('1');
    expect(results[0].similarity).toBeGreaterThanOrEqual(60);
  });

  it('returns empty array when no titles meet the threshold', () => {
    const results = findSimilarIssues('Deploy Kubernetes Cluster', sampleIssues, 70);
    expect(results).toEqual([]);
  });

  it('returns empty array when given an empty title or list', () => {
    expect(findSimilarIssues('', sampleIssues)).toEqual([]);
    expect(findSimilarIssues('Fix Login', [])).toEqual([]);
  });
});
