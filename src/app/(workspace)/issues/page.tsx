'use client';

import { useState } from 'react';
import { ListTodo, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';
import { WorkItemDetailPanel } from '@/components/work-items/WorkItemDetailPanel';

export default function IssuesPage() {
  const { currentUser, activeProjectKey, userScope, setUserScope } = useWorkspaceStore();
  const {
    issues,
    states,
    displayIssues,
    memberMap,
    overdueIssueIds,
    blockedIssueIds,
    permissionError,
    fetchingIssues,
    fetchProjectData,
  } = useWorkspaceData();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const selectedIssue = selectedIssueId ? issues.find(i => i.id === selectedIssueId) || null : null;

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
          onClick={() => fetchProjectData(true)}
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
              <div
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 hover:border-blue-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                  <span className="text-xs text-[#71717A] shrink-0 font-mono">
                    {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
                  </span>
                  <span className="text-sm font-medium text-[#FAFAFA] truncate">{issue.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {overdueIssueIds.has(issue.id) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                      Overdue
                    </span>
                  )}
                  {blockedIssueIds.has(issue.id) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                      Blocked
                    </span>
                  )}
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

      {selectedIssue && (
        <WorkItemDetailPanel
          issue={selectedIssue}
          allIssues={issues}
          states={states}
          memberMap={memberMap}
          activeProjectKey={activeProjectKey}
          currentUserId={currentUser?.id || null}
          onClose={() => setSelectedIssueId(null)}
          onOpenIssue={(id) => setSelectedIssueId(id)}
          onChanged={() => fetchProjectData(true)}
        />
      )}
    </div>
  );
}
