'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ListTodo, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';
import { TechnicalLabel } from '@/components/ui/TechnicalLabel';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const WorkItemDetailPanel = dynamic(
  () => import('@/components/work-items/WorkItemDetailPanel').then(m => m.WorkItemDetailPanel),
  { ssr: false }
);

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
    <div className="p-4 sm:p-6 overflow-y-auto h-full scrollbar-thin space-y-4 bg-[#05070A]">
      <div className="flex items-center justify-between bg-[#0B0F14] border border-white/[0.06] p-3.5 rounded-xl">
        <div className="flex items-center gap-2.5">
          <ListTodo className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold font-mono uppercase text-[#FAFAFA] flex items-center gap-2">
              Work Items & Operations ({displayIssues.length})
              {userScope === 'my_tasks' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  Assigned
                </span>
              )}
            </h2>
            <div className="text-[11px] text-[#71717A] font-mono mt-0.5">
              Mission Scope: <span className="text-cyan-400">{activeProjectKey || 'GLOBAL'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchProjectData(true)}
          disabled={fetchingIssues}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10151C] border border-white/[0.08] hover:border-cyan-400/40 text-xs font-mono text-[#A1A1AA] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetchingIssues ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {permissionError ? (
        <div className="p-8 border border-white/[0.06] rounded-xl bg-[#0B0F14] text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs font-mono text-[#A1A1AA]">{permissionError}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayIssues.map(issue => {
            let assigneeName = '';
            if (Array.isArray((issue as any).assignee_details) && (issue as any).assignee_details.length > 0) {
              const detail = (issue as any).assignee_details[0];
              if (typeof detail === 'object' && detail !== null) {
                assigneeName = `${detail.first_name || ''} ${detail.last_name || ''}`.trim() || detail.display_name || detail.email || '';
              }
            }
            if (!assigneeName) {
              const rawAssignees = Array.isArray(issue.assignees) && issue.assignees.length > 0
                ? issue.assignees
                : (Array.isArray((issue as any).assignee_ids) ? (issue as any).assignee_ids : []);
              if (rawAssignees.length > 0) {
                const first = rawAssignees[0];
                if (typeof first === 'object' && first !== null) {
                  assigneeName = `${first.first_name || ''} ${first.last_name || ''}`.trim() || first.display_name || first.email || '';
                } else if (typeof first === 'string') {
                  assigneeName = memberMap.get(first) || '';
                }
              }
            }

            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F14] border border-white/[0.06] hover:border-cyan-400/40 hover:bg-[#10151C] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                  <span className="text-[11px] text-cyan-400 shrink-0 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
                  </span>
                  <span className="text-xs font-medium text-[#FAFAFA] truncate group-hover:text-cyan-300 transition-colors">
                    {issue.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {overdueIssueIds.has(issue.id) && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                      Overdue
                    </span>
                  )}
                  {blockedIssueIds.has(issue.id) && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                      Blocked
                    </span>
                  )}
                  {assigneeName && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10151C] text-cyan-400 border border-cyan-500/20 font-medium">
                      {assigneeName.split(' ')[0]}
                    </span>
                  )}
                  {issue.priority && issue.priority !== 'none' && (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#10151C] text-[#71717A] border border-white/[0.06]">
                      {issue.priority}
                    </span>
                  )}
                  {issue.state_detail && (
                    <span
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/[0.08] font-medium"
                      style={{ color: issue.state_detail.color || '#38BDF8' }}
                    >
                      {issue.state_detail.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {displayIssues.length === 0 && !fetchingIssues && (
            <div className="text-center text-[#71717A] py-16 bg-[#0B0F14] border border-white/[0.06] rounded-xl p-8 space-y-2">
              <Layers className="w-10 h-10 mx-auto mb-2 text-[#52525B]" />
              <p className="text-xs font-mono font-bold uppercase text-[#FAFAFA]">NO ACTIVE OPERATIONS FOUND</p>
              <p className="text-[11px] font-mono text-[#71717A] max-w-sm mx-auto">
                No tasks assigned to your operator profile in this mission. Switch to workspace scope or capture new tasks.
              </p>
              <button
                onClick={() => setUserScope('all')}
                className="mt-3 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                View Global Scope ({issues.length})
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedIssue && (
          <WorkItemDetailPanel
            key={selectedIssue.id}
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
      </AnimatePresence>
    </div>
  );
}
