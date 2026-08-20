'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';
import { WorkItemDetailPanel } from '@/components/work-items/WorkItemDetailPanel';

export default function BoardPage() {
  const { currentUser, activeProjectId, activeProjectKey, setActiveProject } = useWorkspaceStore();
  const {
    issues,
    projects,
    displayIssues,
    states,
    memberMap,
    permissionError,
    fetchProjectData,
    handleMoveIssue,
    handleBulkUpdatePriority,
  } = useWorkspaceData();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const selectedIssue = selectedIssueId ? issues.find(i => i.id === selectedIssueId) || null : null;

  if (permissionError) {
    return (
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
    );
  }

  return (
    <>
      <KanbanBoard
        issues={displayIssues.map(issue => {
          const stateId = typeof issue.state === 'string'
            ? issue.state
            : (issue.state as { id?: string } | undefined)?.id || issue.state_detail?.id || '';

          const rawAssignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '';
          const assigneeName = rawAssignee ? memberMap.get(rawAssignee) || undefined : undefined;

          return {
            id: issue.id,
            key: `${issue.project_detail?.identifier || activeProjectKey || '?'}-${issue.sequence_id}`,
            title: issue.name,
            priority: issue.priority || 'none',
            stateId,
            assignee: assigneeName,
          };
        })}
        states={states}
        onMoveIssue={handleMoveIssue}
        onBulkUpdatePriority={handleBulkUpdatePriority}
        onSelectIssue={(id) => setSelectedIssueId(id)}
      />

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
    </>
  );
}
