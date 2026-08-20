import { describe, it, expect, vi } from 'vitest';
import { executeIntent } from './executor';
import { PlaneService } from '@/infrastructure/plane/PlaneClient';

describe('AI Executor with ALL Project Scope', () => {
  const mockPlaneService = {
    resolveProjectId: vi.fn(async (key: string) => (key === 'ALL' ? 'ALL' : 'proj-1')),
    listProjects: vi.fn(async () => [
      { id: 'proj-1', name: 'Project One', identifier: 'P1' },
      { id: 'proj-2', name: 'Project Two', identifier: 'P2' },
    ]),
    listStates: vi.fn(async () => [
      { id: 'state-1', name: 'Done', color: '#10B981', group: 'completed' },
      { id: 'state-2', name: 'In Progress', color: '#3B82F6', group: 'started' },
    ]),
    getMemberMap: vi.fn(async () => new Map([['user-1', 'John Doe']])),
    listIssues: vi.fn(async () => [
      { id: 'issue-1', name: 'Task 1', sequence_id: 1, state: 'state-1', priority: 'high', assignees: ['user-1'], project: 'proj-1' },
      { id: 'issue-2', name: 'Task 2', sequence_id: 2, state: 'state-2', priority: 'medium', assignees: ['user-1'], project: 'proj-2' },
    ]),
    createIssue: vi.fn(async (projId, data) => ({
      id: 'new-issue-1',
      name: data.name,
      sequence_id: 3,
      priority: data.priority,
      project: projId,
    })),
    getIssue: vi.fn(async (projId, key) => ({
      id: 'issue-1',
      name: 'Task 1',
      sequence_id: 1,
      state: 'state-1',
      priority: 'high',
      assignees: ['user-1'],
      project: 'proj-1',
    })),
    resolveIssueInfo: vi.fn(async () => ({
      issueId: 'issue-1',
      realProjectId: 'proj-1',
    })),
    resolveStateId: vi.fn(async () => 'state-1'),
    resolveMemberName: vi.fn(async () => 'John Doe'),
    updateIssue: vi.fn(async (projId, key, payload) => ({
      id: 'issue-1',
      name: 'Task 1',
      sequence_id: 1,
      state: payload.state || 'state-1',
      priority: payload.priority || 'high',
    })),
  } as unknown as PlaneService;

  it('lists issues across all projects when projectKey is ALL', async () => {
    const cards = await executeIntent(
      {
        intent: 'list_issues',
        confidence: 1,
        entities: { projectKey: 'ALL', userScope: 'all' },
      },
      mockPlaneService
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('issue_list');
    expect(cards[0].data.items).toHaveLength(2);
    expect(cards[0].title).toContain('All Projects (ALL)');
  });

  it('creates issue in default first project when projectKey is ALL', async () => {
    const cards = await executeIntent(
      {
        intent: 'create_issue',
        confidence: 1,
        entities: { projectKey: 'ALL', title: 'New Global Task' },
      },
      mockPlaneService
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('issue_created');
    expect(cards[0].data.title).toBe('New Global Task');
  });

  it('batches issue creation when projectKey is ALL', async () => {
    const cards = await executeIntent(
      {
        intent: 'batch_create_issues',
        confidence: 1,
        entities: { projectKey: 'ALL', titles: ['Task A', 'Task B'] },
      },
      mockPlaneService
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('batch_issues_created');
    expect(cards[0].data.items).toHaveLength(2);
  });
});
