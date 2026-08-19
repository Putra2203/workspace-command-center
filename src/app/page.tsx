'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { MobileNav } from '@/components/layout/MobileNav';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { BarChart3, ListTodo, Loader2, RefreshCw, AlertTriangle, Layers, User, Users } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  identifier: string;
}

interface Issue {
  id: string;
  name: string;
  sequence_id: number;
  state: any;
  state_detail?: { id?: string; name: string; group: string; color: string };
  priority: string;
  assignees?: string[];
  project_detail?: { identifier: string };
}

interface State {
  id: string;
  name: string;
  group: string;
  color: string;
}

export default function Home() {
  const {
    activeView,
    activeProjectId,
    activeProjectKey,
    setActiveProject,
    userScope,
    setUserScope,
    currentUser,
    setCurrentUser
  } = useWorkspaceStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch all projects on mount
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plane?action=listProjects');
      const data = await res.json();
      const results: Project[] = Array.isArray(data) ? data : data.results || [];
      setProjects(results);

      if (results.length > 0) {
        // Keep the last-used project (restored from the workspace store on init)
        // if it's still in this workspace's project list; otherwise fall back to
        // the first project returned by the API — no specific identifier assumed.
        const stillValid = activeProjectId && results.some(p => p.id === activeProjectId);
        if (!stillValid) {
          setActiveProject(results[0].id, results[0].identifier);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, setActiveProject]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch issues, states, and members when active project changes
  const fetchProjectData = useCallback(async () => {
    if (!activeProjectId) return;

    try {
      setFetchingIssues(true);
      setPermissionError(null);

      const [issuesRes, statesRes, membersRes] = await Promise.all([
        fetch(`/api/plane?action=listIssues&projectId=${activeProjectId}`),
        fetch(`/api/plane?action=listStates&projectId=${activeProjectId}`),
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
    } catch (err: any) {
      console.error('Failed to fetch project data:', err);
      setPermissionError(err.message || 'Failed to load project data');
    } finally {
      setFetchingIssues(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Construct Map of Member UUID -> Human Name
  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
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

  const renderMainContent = () => {
    switch (activeView) {
      case 'command':
        return <ChatInterface onActionExecuted={fetchProjectData} />;
      case 'board':
        return permissionError ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Access Restricted</h3>
            <p className="text-sm text-[#A1A1AA] max-w-sm mt-1 mb-4">{permissionError}</p>
            <button
              onClick={() => {
                const fallback = projects.find(p => p.id !== activeProjectId);
                if (fallback) setActiveProject(fallback.id, fallback.identifier);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Switch to Another Project
            </button>
          </div>
        ) : (
          <KanbanBoard
            issues={displayIssues.map(issue => {
              const stateId = typeof issue.state === 'string'
                ? issue.state
                : issue.state?.id || issue.state_detail?.id || '';
              
              const rawAssignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '';
              const assigneeName = rawAssignee ? memberMap.get(rawAssignee) || undefined : undefined;

              return {
                id: issue.id,
                key: `${issue.project_detail?.identifier || activeProjectKey || '?'}-${issue.sequence_id}`,
                title: issue.name,
                priority: issue.priority || 'none',
                stateId: stateId,
                assignee: assigneeName,
              };
            })}
            states={states}
            onMoveIssue={handleMoveIssue}
          />
        );
      case 'issues':
        return (
          <div className="p-6 overflow-y-auto h-full scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[#FAFAFA]">
                <ListTodo className="w-5 h-5 text-blue-500" />
                Issues ({displayIssues.length})
                {userScope === 'my_tasks' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    Mine Only
                  </span>
                )}
              </h2>
              <button
                onClick={fetchProjectData}
                disabled={fetchingIssues}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111113] border border-white/10 hover:bg-[#18181B] text-xs text-[#A1A1AA] hover:text-[#FAFAFA] rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingIssues ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>

            {permissionError ? (
              <div className="p-8 border border-white/5 rounded-xl bg-[#111113] text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-[#A1A1AA]">{permissionError}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayIssues.map(issue => {
                  const rawAssignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '';
                  const assigneeName = rawAssignee ? memberMap.get(rawAssignee) || '' : '';

                  return (
                    <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                        <span className="text-xs text-[#71717A] shrink-0 font-mono">
                          {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
                        </span>
                        <span className="text-sm font-medium text-[#FAFAFA] truncate">{issue.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {assigneeName && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#18181B] text-blue-400 border border-blue-500/20 font-medium">
                            {assigneeName}
                          </span>
                        )}
                        {issue.priority && issue.priority !== 'none' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#18181B] text-[#A1A1AA] border border-white/5 capitalize">
                            {issue.priority}
                          </span>
                        )}
                        {issue.state_detail && (
                          <span
                            className="text-[10px] px-2.5 py-0.5 rounded-full border border-white/10 font-medium"
                            style={{ color: issue.state_detail.color || '#3B82F6' }}
                          >
                            {issue.state_detail.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {displayIssues.length === 0 && !fetchingIssues && (
                  <div className="text-center text-[#71717A] py-16 bg-[#111113] border border-white/5 rounded-xl p-8">
                    <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-[#FAFAFA]">No tasks assigned to you in this project.</p>
                    <p className="text-xs text-[#71717A] mt-1 mb-4">You can switch to view all team tasks or create new tasks using AI command.</p>
                    <button
                      onClick={() => setUserScope('all')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Show All Team Tasks ({issues.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-[#FAFAFA] mb-2">Project Health Analytics</h2>
            <p className="text-[#71717A] max-w-md text-sm">
              Live velocity, cycle completion stats, and risk tracking for <span className="text-blue-400 font-mono">{activeProjectKey}</span> are actively synchronized.
            </p>
          </div>
        );
      default:
        return <ChatInterface onActionExecuted={fetchProjectData} />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[#71717A] text-sm font-medium">Connecting to Plane Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar - Desktop only */}
      <Sidebar projects={projects} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#09090B] shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-[#FAFAFA]">
              {activeView === 'command' && 'AI Command Center'}
              {activeView === 'board' && 'Kanban Board'}
              {activeView === 'issues' && 'Issue Backlog'}
              {activeView === 'cycles' && 'Cycles'}
              {activeView === 'analytics' && 'Analytics'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
              {activeProjectKey || 'No Project'}
            </span>
          </div>

          {/* Center/Right Scope Switcher & Actions */}
          <div className="flex items-center gap-3">
            {/* Segmented Control for User Scope */}
            <div className="flex items-center p-0.5 bg-[#111113] border border-white/10 rounded-lg">
              <button
                onClick={() => setUserScope('my_tasks')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'my_tasks'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Tasks</span>
              </button>
              <button
                onClick={() => setUserScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Team</span>
              </button>
            </div>

            <button
              onClick={fetchProjectData}
              disabled={fetchingIssues}
              title="Refresh live project data"
              className="p-2 rounded-lg bg-[#111113] border border-white/10 hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingIssues ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={() => useWorkspaceStore.getState().toggleCommandPalette()}
              className="text-xs text-[#71717A] px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/10 hover:border-white/20 transition-colors font-mono hidden sm:block"
            >
              ⌘K
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {renderMainContent()}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
