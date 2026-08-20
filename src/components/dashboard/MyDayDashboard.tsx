'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Activity, AlertTriangle, Ban, CalendarClock, Flame, Clock, Ticket, Check, GitBranch, Copy, CheckCircle2 } from 'lucide-react';
import { computeMyDayBuckets, type PlaneStateLike, type WorkItemLike } from '@/domain/work_items/my-day';
import { scoreTask } from '@/domain/work_items/scoring';
import { detectStaleAndBlockedWork } from '@/domain/work_items/stale-work';
import { filterUnassignedTickets } from '@/domain/work_items/ticket-pool';
import { getNextFocusTask } from '@/domain/work_items/focus-queue';
import { generateGitBranchSuggestion } from '@/domain/git/git-context';
import dynamic from 'next/dynamic';
import { FocusModeBanner } from './FocusModeBanner';
import { QuickTaskCapture } from './QuickTaskCapture';
import { WeeklyPerformanceWidget } from './WeeklyPerformanceWidget';
import { InboxTriageWidget } from './InboxTriageWidget';

const WorkItemDetailPanel = dynamic(
  () => import('@/components/work-items/WorkItemDetailPanel').then(m => m.WorkItemDetailPanel),
  { ssr: false }
);

interface Issue extends WorkItemLike {
  name?: string;
  title?: string;
  sequence_id?: number;
  priority?: string;
  state?: any;
  updated_at?: string;
  project_detail?: { identifier: string };
  description_html?: string;
  start_date?: string;
  estimate_point?: number | null;
  parent?: string | null;
  labels?: string[];
  created_at?: string;
}

interface MyDayDashboardProps {
  issues: Issue[];
  states: PlaneStateLike[];
  memberMap: Map<string, string>;
  currentUserId: string | null;
  activeProjectKey: string | null;
  onRefreshNeeded?: () => void;
}

export function MyDayDashboard({ issues, states, memberMap, currentUserId, activeProjectKey, onRefreshNeeded }: MyDayDashboardProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const selectedIssue = selectedIssueId ? issues.find(i => i.id === selectedIssueId) || null : null;
  const { metrics, dueTodayIssues, overdueIssues, blockedIssues, activeIssues } = useMemo(
    () => computeMyDayBuckets(issues, states, currentUserId),
    [issues, states, currentUserId]
  );

  const unassignedTickets = useMemo(
    () => filterUnassignedTickets(issues, states),
    [issues, states]
  );

  const staleOrBlockedList = useMemo(
    () => detectStaleAndBlockedWork(issues, states, 14),
    [issues, states]
  );

  const focusTask = useMemo(
    () => getNextFocusTask(issues, states, currentUserId),
    [issues, states, currentUserId]
  );

  const recommended = useMemo(
    () =>
      activeIssues
        .map(issue => ({ issue, score: scoreTask({ dueDate: issue.target_date, priority: issue.priority }) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ issue }) => issue),
    [activeIssues]
  );

  const cards = [
    { label: 'Active', value: metrics.active, icon: Activity, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
    { label: 'Due Today', value: metrics.dueToday, icon: CalendarClock, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
    { label: 'Overdue', value: metrics.overdue, icon: AlertTriangle, color: 'text-red-400 border-red-500/20 bg-red-500/10' },
    { label: 'Blocked', value: metrics.blocked, icon: Ban, color: 'text-purple-400 border-purple-500/20 bg-purple-500/10' },
  ];

  const handleTaskUpdated = () => {
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const handleClaimTicket = async (issue: Issue) => {
    if (!currentUserId) return;
    const projectKey = issue.project_detail?.identifier || activeProjectKey || 'PROJECT1';
    try {
      await fetch(`/api/plane?action=updateIssue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectKey,
          issueId: issue.id,
          data: { assignees: [currentUserId] },
        }),
      });
      handleTaskUpdated();
    } catch (err) {
      console.error('Failed to claim ticket:', err);
    }
  };

  if (!currentUserId) {
    return (
      <div className="p-6 flex items-center justify-center h-full text-sm text-[#71717A]">
        Resolving your account…
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full scrollbar-thin space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">My Day & Workstation</h2>
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Workstation for <span className="font-mono text-blue-400">{activeProjectKey || 'All Projects'}</span>
          </p>
        </div>
      </div>

      {/* Focus Mode Hero Banner */}
      <FocusModeBanner
        task={focusTask}
        activeProjectKey={activeProjectKey}
        onTaskCompleted={handleTaskUpdated}
      />

      {/* Quick Task Capture */}
      <QuickTaskCapture
        activeProjectKey={activeProjectKey}
        onTaskCreated={handleTaskUpdated}
      />

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-2.5 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#FAFAFA] leading-tight">{card.value}</div>
                <div className="text-[10px] text-[#71717A] truncate">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Velocity & Inbox Triage — single column */}
      <div className="space-y-3">
        <WeeklyPerformanceWidget activeProjectId={activeProjectKey} />
        <InboxTriageWidget activeProjectKey={activeProjectKey} onTaskConverted={handleTaskUpdated} />
      </div>

      {/* Claimable Ticket Pool Section */}
      {unassignedTickets.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <Ticket className="w-3.5 h-3.5" />
              <span>Unassigned Ticket Pool ({unassignedTickets.length})</span>
            </div>
            <span className="text-[10px] font-mono text-[#71717A] hidden sm:inline">Ready to claim across projects</span>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
            {unassignedTickets.slice(0, 5).map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedIssueId(ticket.id)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#111113] border border-white/10 hover:border-blue-500/40 transition-all gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-semibold text-blue-400 shrink-0 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {ticket.project_detail?.identifier || activeProjectKey || 'TASK'}-{ticket.sequence_id || ''}
                  </span>
                  <span className="text-xs text-[#FAFAFA] font-medium truncate">{ticket.name || ticket.title}</span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleClaimTicket(ticket); }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                >
                  <Check className="w-3 h-3" />
                  <span>Claim</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale or Blocked Work */}
      {staleOrBlockedList.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Stale or Blocked Work Detected ({staleOrBlockedList.length})</span>
          </div>
          <div className="space-y-1">
            {staleOrBlockedList.slice(0, 3).map((item) => (
              <div key={item.id} className="text-xs text-[#FAFAFA] flex items-center justify-between">
                <span className="truncate max-w-md">{item.title}</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  {item.reason === 'stale' ? `${item.daysInactive}d inactive` : item.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Next */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1.5">Recommended Next</h3>
        {recommended.length === 0 ? (
          <p className="text-xs text-[#52525B] px-1">Nothing active to work on.</p>
        ) : (
          <div className="space-y-1">
            {recommended.map((issue, i) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 hover:border-blue-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                  <Flame className={`w-3.5 h-3.5 shrink-0 ${i === 0 ? 'text-orange-400' : 'text-[#52525B]'}`} />
                  <span className="text-xs text-[#71717A] font-mono shrink-0">
                    {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
                  </span>
                  <span className="text-sm text-[#FAFAFA] truncate">{issue.name || issue.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Buckets — single column */}
      <InteractiveIssueBucket
        title="Due Today"
        issues={dueTodayIssues}
        activeProjectKey={activeProjectKey}
        states={states}
        emptyText="Nothing due today."
        onTaskUpdated={handleTaskUpdated}
        onSelectIssue={(id) => setSelectedIssueId(id)}
      />
      <InteractiveIssueBucket
        title="Overdue"
        issues={overdueIssues}
        activeProjectKey={activeProjectKey}
        states={states}
        emptyText="Nothing overdue."
        onTaskUpdated={handleTaskUpdated}
        onSelectIssue={(id) => setSelectedIssueId(id)}
      />
      <InteractiveIssueBucket
        title="Blocked"
        issues={blockedIssues}
        activeProjectKey={activeProjectKey}
        states={states}
        emptyText="Nothing blocked."
        onTaskUpdated={handleTaskUpdated}
        onSelectIssue={(id) => setSelectedIssueId(id)}
      />

      {/* Work Item Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedIssue && (
          <WorkItemDetailPanel
            key={selectedIssue.id}
            issue={selectedIssue}
            allIssues={issues}
            states={states}
            memberMap={memberMap}
            activeProjectKey={activeProjectKey}
            currentUserId={currentUserId}
            onClose={() => setSelectedIssueId(null)}
            onOpenIssue={(id) => setSelectedIssueId(id)}
            onChanged={handleTaskUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InteractiveIssueBucket({
  title,
  issues,
  activeProjectKey,
  states,
  emptyText,
  onTaskUpdated,
  onSelectIssue,
}: {
  title: string;
  issues: Issue[];
  activeProjectKey: string | null;
  states: PlaneStateLike[];
  emptyText: string;
  onTaskUpdated: () => void;
  onSelectIssue?: (issueId: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleMarkDone = async (issue: Issue) => {
    const projectKey = issue.project_detail?.identifier || activeProjectKey || 'PROJECT1';
    const doneState = states.find(s => s.group?.toLowerCase() === 'completed' || s.name.toLowerCase() === 'done');
    if (!doneState?.id) return;

    try {
      await fetch(`/api/plane?action=updateIssue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectKey,
          issueId: issue.id,
          data: { state: doneState.id },
        }),
      });
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to mark issue done:', err);
    }
  };

  const handlePriorityChange = async (issue: Issue, newPriority: string) => {
    const projectKey = issue.project_detail?.identifier || activeProjectKey || 'PROJECT1';
    try {
      await fetch(`/api/plane?action=updateIssue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectKey,
          issueId: issue.id,
          data: { priority: newPriority },
        }),
      });
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleCopyGitBranch = (issue: Issue) => {
    const key = `${issue.project_detail?.identifier || activeProjectKey || 'TASK'}-${issue.sequence_id || ''}`;
    const suggestion = generateGitBranchSuggestion(key, issue.name || issue.title || '');
    navigator.clipboard.writeText(suggestion.branchName);
    setCopiedId(issue.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">{title}</h3>
        <span className="text-[10px] font-mono text-[#52525B] bg-[#111113] px-2 py-0.5 rounded border border-white/5">
          {issues.length}
        </span>
      </div>

      {issues.length === 0 ? (
        <p className="text-xs text-[#52525B] px-1">{emptyText}</p>
      ) : (
        <div className="space-y-1">
          {issues.map(issue => {
            const key = `${issue.project_detail?.identifier || activeProjectKey || 'TASK'}-${issue.sequence_id || ''}`;
            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue?.(issue.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 hover:border-blue-500/30 transition-all gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Mark Done Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkDone(issue); }}
                    title="Mark Done"
                    className="w-5 h-5 rounded-full border border-white/20 hover:border-green-400 hover:bg-green-500/20 text-[#71717A] hover:text-green-400 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Check className="w-3 h-3" />
                  </button>

                  <span className="text-xs text-blue-400 font-mono shrink-0 font-semibold">{key}</span>
                  <span className="text-sm text-[#FAFAFA] truncate font-medium">{issue.name || issue.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Inline Priority Selector */}
                  <select
                    value={issue.priority || 'none'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handlePriorityChange(issue, e.target.value)}
                    className="bg-[#18181B] border border-white/10 text-[10px] text-[#A1A1AA] rounded px-2 py-0.5 outline-none font-mono capitalize"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="none">None</option>
                  </select>

                  {/* Copy Git Branch Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyGitBranch(issue); }}
                    title="Copy Git Branch Name"
                    className="p-1.5 rounded bg-[#18181B] border border-white/10 hover:border-blue-500/40 text-[#71717A] hover:text-blue-400 transition-colors flex items-center gap-1 text-[10px]"
                  >
                    {copiedId === issue.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 font-mono">Copied</span>
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-3 h-3" />
                        <Copy className="w-2.5 h-2.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
