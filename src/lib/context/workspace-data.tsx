'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { filterOverdueIssues, filterBlockedIssues } from '@/domain/work_items/my-day';

export interface Project {
  id: string;
  name: string;
  identifier: string;
}

export interface Issue {
  id: string;
  name: string;
  sequence_id: number;
  state: unknown;
  state_detail?: { id?: string; name: string; group: string; color: string };
  priority: string;
  assignees?: string[];
  project_detail?: { identifier: string };
}

export interface PlaneState {
  id: string;
  name: string;
  group: string;
  color: string;
}

interface PlaneMemberLike {
  id?: string;
  member?: { id?: string; first_name?: string; last_name?: string; email?: string };
}

interface WorkspaceDataContextValue {
  projects: Project[];
  projectsLoading: boolean;
  refetchProjects: () => void;
  issues: Issue[];
  states: PlaneState[];
  members: unknown[];
  memberMap: Map<string, string>;
  displayIssues: Issue[];
  overdueIssueIds: Set<string>;
  blockedIssueIds: Set<string>;
  permissionError: string | null;
  fetchingIssues: boolean;
  fetchProjectData: (forceRefresh?: boolean) => Promise<void>;
  handleMoveIssue: (issueId: string, newStateId: string) => Promise<void>;
  handleBulkUpdatePriority: (updates: { issueId: string; priority: string }[]) => Promise<void>;
}

const WorkspaceDataContext = createContext<WorkspaceDataContextValue | null>(null);

export function useWorkspaceData(): WorkspaceDataContextValue {
  const ctx = useContext(WorkspaceDataContext);
  if (!ctx) throw new Error('useWorkspaceData must be used within a WorkspaceDataProvider');
  return ctx;
}

/**
 * Hoisted out of the old single-page component so every route under
 * `(workspace)/` shares one fetch of issues/states/members instead of each
 * page re-fetching independently.
 */
export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  const { activeProjectId, setActiveProject, currentUser, setCurrentUser, userScope } = useWorkspaceStore();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [states, setStates] = useState<PlaneState[]>([]);
  const [members, setMembers] = useState<unknown[]>([]);
  const [fetchingIssues, setFetchingIssues] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Resolve the real authenticated user from Plane on mount (no hardcoded default)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/plane?action=getMe');
        if (!res.ok) throw new Error(`getMe failed: ${res.status}`);
        const user = await res.json();
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
        setCurrentUser({ id: user.id, name, email: user.email, avatar: user.avatar_url });
      } catch (err) {
        console.error('Failed to resolve current user:', err);
      }
    })();
  }, [setCurrentUser]);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const res = await fetch('/api/plane?action=listProjects');
      if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Keep the last-used project (restored from the workspace store on init) if
  // it's still in this workspace's project list; otherwise fall back to the
  // first project returned by the API — no specific identifier assumed.
  useEffect(() => {
    if (projects.length === 0) return;
    const stillValid = activeProjectId && projects.some(p => p.id === activeProjectId);
    if (!stillValid) {
      setActiveProject(projects[0].id, projects[0].identifier);
    }
  }, [projects, activeProjectId, setActiveProject]);

  // Fetch issues, states, and members when active project changes.
  // `forceRefresh` bypasses the Supabase-backed states cache (P0-10) — used
  // by manual refresh and the auto-refresh interval below, since a stale
  // cached state list (up to 60s old) could otherwise mask an external
  // Plane change (e.g. a renamed/re-grouped state) for up to a minute.
  const fetchProjectData = useCallback(async (forceRefresh = false) => {
    if (!activeProjectId) return;

    try {
      setFetchingIssues(true);
      setPermissionError(null);

      const [issuesRes, statesRes, membersRes] = await Promise.all([
        fetch(`/api/plane?action=listIssues&projectId=${activeProjectId}`),
        fetch(`/api/plane?action=listStates&projectId=${activeProjectId}${forceRefresh ? '&bypassCache=true' : ''}`),
        fetch(`/api/plane?action=listMembers&projectId=${activeProjectId}`).catch(() => null),
      ]);

      const issuesData = await issuesRes.json();
      const statesData = await statesRes.json();
      const membersData = membersRes ? await membersRes.json().catch(() => []) : [];

      if (issuesData.error && issuesData.error.includes('403')) {
        setPermissionError(`You do not have access permission for this project.`);
        setIssues([]);
      } else {
        const rawIssues = Array.isArray(issuesData) ? issuesData : issuesData.results || [];
        setIssues(rawIssues);
      }

      const rawStates = Array.isArray(statesData) ? statesData : statesData.results || [];
      setStates(rawStates);

      const rawMembers = Array.isArray(membersData) ? membersData : membersData.results || [];
      setMembers(rawMembers);
    } catch (err: unknown) {
      console.error('Failed to fetch project data:', err);
      setPermissionError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setFetchingIssues(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Auto-refresh every 5 minutes, bypassing the states cache each time —
  // keeps My Day (and every other view sharing this data) from silently
  // going stale between manual refreshes.
  useEffect(() => {
    if (!activeProjectId) return;
    const interval = setInterval(() => fetchProjectData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeProjectId, fetchProjectData]);

  // Construct Map of Member UUID -> Human Name
  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    (members as PlaneMemberLike[]).forEach(m => {
      const name = m.member ? `${m.member.first_name || ''} ${m.member.last_name || ''}`.trim() || m.member.email : '';
      if (m.id && name) map.set(m.id, name);
      if (m.member?.id && name) map.set(m.member.id, name);
    });
    return map;
  }, [members]);

  // Filter issues based on User Scope. Fail closed: with no resolved current-user
  // identity yet, show nothing rather than guessing at who "my tasks" means.
  const displayIssues = useMemo(() => {
    if (userScope === 'all') return issues;
    if (!currentUser?.id) return [];

    return issues.filter(issue => {
      if (!issue.assignees || issue.assignees.length === 0) return false;
      return issue.assignees.includes(currentUser.id);
    });
  }, [issues, userScope, currentUser]);

  // Project-wide (not "mine only") overdue/blocked lookup for the Issues list badges
  const overdueIssueIds = useMemo(
    () => new Set(filterOverdueIssues(issues, states).map(i => i.id)),
    [issues, states]
  );
  const blockedIssueIds = useMemo(
    () => new Set(filterBlockedIssues(issues, states).map(i => i.id)),
    [issues, states]
  );

  // Persisted Move Issue (PATCH to Plane API)
  const handleMoveIssue = useCallback(async (issueId: string, newStateId: string) => {
    if (!activeProjectId) return;

    // 1. Optimistic UI update
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        const matchingState = states.find(s => s.id === newStateId);
        return {
          ...issue,
          state: newStateId,
          state_detail: matchingState ? { ...matchingState } : issue.state_detail
        };
      }
      return issue;
    }));

    // 2. Persist to Plane API backend
    try {
      const res = await fetch('/api/plane?action=updateIssue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          issueId,
          state: newStateId
        })
      });
      if (!res.ok) {
        console.error('Failed to persist issue move:', await res.text());
        fetchProjectData();
      }
    } catch (err) {
      console.error('Error persisting issue move:', err);
      fetchProjectData();
    }
  }, [activeProjectId, states, fetchProjectData]);

  // Applies a confirmed bulk-priority ActionPlan (see BulkActionPreview) —
  // reuses the same single-issue update endpoint per issue, no new Plane
  // endpoint needed.
  const handleBulkUpdatePriority = useCallback(async (updates: { issueId: string; priority: string }[]) => {
    if (!activeProjectId) return;

    const priorityById = new Map(updates.map(u => [u.issueId, u.priority]));
    setIssues(prev => prev.map(issue =>
      priorityById.has(issue.id) ? { ...issue, priority: priorityById.get(issue.id)! } : issue
    ));

    const results = await Promise.allSettled(
      updates.map(({ issueId, priority }) =>
        fetch('/api/plane?action=updateIssue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: activeProjectId, issueId, priority }),
        })
      )
    );

    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    if (failed.length > 0) {
      console.error(`Bulk priority update: ${failed.length}/${updates.length} failed`);
      fetchProjectData();
    }
  }, [activeProjectId, fetchProjectData]);

  const value: WorkspaceDataContextValue = {
    projects,
    projectsLoading,
    refetchProjects,
    issues,
    states,
    members,
    memberMap,
    displayIssues,
    overdueIssueIds,
    blockedIssueIds,
    permissionError,
    fetchingIssues,
    fetchProjectData,
    handleMoveIssue,
    handleBulkUpdatePriority,
  };

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}
