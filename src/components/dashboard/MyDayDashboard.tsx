'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Activity, AlertTriangle, Ban, CalendarClock, Flame, Clock, CheckCircle2, UserPlus, Radio } from 'lucide-react';
import { computeMyDayBuckets, type PlaneStateLike, type WorkItemLike } from '@/domain/work_items/my-day';
import { scoreTask } from '@/domain/work_items/scoring';
import { detectStaleAndBlockedWork } from '@/domain/work_items/stale-work';
import { filterUnassignedTickets } from '@/domain/work_items/ticket-pool';
import { getNextFocusTask } from '@/domain/work_items/focus-queue';
import dynamic from 'next/dynamic';
import { FocusModeBanner } from './FocusModeBanner';
import { QuickTaskCapture } from './QuickTaskCapture';
import { WeeklyPerformanceWidget } from './WeeklyPerformanceWidget';
import { InboxTriageWidget } from './InboxTriageWidget';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TechnicalLabel } from '@/components/ui/TechnicalLabel';
import { TechnicalDivider } from '@/components/ui/TechnicalDivider';

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

  const telemetryStrip = [
    { label: 'ACTIVE OPERATIONS', value: metrics.active, subtext: 'In progress', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
    { label: 'DUE TODAY', value: metrics.dueToday, subtext: 'Requires delivery', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
    { label: 'OVERDUE CRITICAL', value: metrics.overdue, subtext: 'Past deadline', color: 'text-rose-400 border-rose-500/20 bg-rose-500/10' },
    { label: 'BLOCKED / STALE', value: metrics.blocked, subtext: 'Stalled work', color: 'text-violet-400 border-violet-500/20 bg-violet-500/10' },
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
      <div className="p-6 flex items-center justify-center h-full text-xs font-mono text-[#71717A]">
        SYSTEM INITIALIZING OPERATOR CONTEXT…
      </div>
    );
  }

  const currentDateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full scrollbar-thin space-y-4 pb-20 md:pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F14] border border-white/[0.06] p-3.5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#FAFAFA] uppercase font-mono tracking-wider">
              Daily Operations Control
            </h2>
            <StatusIndicator status="online" label="OPERATIONAL" />
          </div>
          <p className="text-[11px] text-[#71717A] mt-0.5 font-mono">
            {currentDateStr} · MISSION CONTEXT:{' '}
            <span className="text-cyan-400 font-semibold">{activeProjectKey || 'GLOBAL WORKSPACE'}</span>
          </p>
        </div>
      </div>

      {/* Primary Mission Focus Banner */}
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

      {/* Telemetry Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {telemetryStrip.map((c) => (
          <div key={c.label} className="p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1">
            <div className="text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A] truncate">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[#FAFAFA]">{c.value}</span>
              <span className="text-[10px] text-[#71717A] font-mono truncate">{c.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Operations Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Recommended & Stale Operations (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recommended Priority Operations */}
          <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <TechnicalLabel>Priority Mission Queue</TechnicalLabel>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">
                {recommended.length} items queued
              </span>
            </div>

            <div className="space-y-1.5">
              {recommended.length > 0 ? (
                recommended.map((task) => {
                  const projectIdentifier = task.project_detail?.identifier || activeProjectKey || 'TASK';
                  const key = task.sequence_id ? `${projectIdentifier}-${task.sequence_id}` : task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedIssueId(task.id)}
                      className="p-2.5 rounded-lg bg-[#10151C] border border-white/[0.06] hover:border-cyan-400/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
                          {key}
                        </span>
                        <span className="text-xs text-[#FAFAFA] font-medium truncate group-hover:text-cyan-300 transition-colors">
                          {task.name || task.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#080B10] text-[#71717A] border border-white/[0.04] shrink-0">
                        {task.priority || 'NORMAL'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs font-mono text-[#52525B]">
                  NO PENDING PRIORITY WORK ITEMS.
                </div>
              )}
            </div>
          </div>

          {/* Stale / Blocked Operations */}
          {staleOrBlockedList.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <TechnicalLabel>Stalled & Blocked Operations ({staleOrBlockedList.length})</TechnicalLabel>
                </div>
              </div>

              <div className="space-y-1.5">
                {staleOrBlockedList.slice(0, 4).map((item) => {
                  const matchingIssue = issues.find(i => i.id === item.id);
                  const projectIdentifier = matchingIssue?.project_detail?.identifier || activeProjectKey || 'TASK';
                  const key = matchingIssue?.sequence_id ? `${projectIdentifier}-${matchingIssue.sequence_id}` : item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIssueId(item.id)}
                      className="p-2.5 rounded-lg bg-[#10151C] border border-rose-500/20 hover:border-rose-400/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                          {key}
                        </span>
                        <span className="text-xs text-[#FAFAFA] truncate font-medium">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded shrink-0">
                        {item.reason}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Unassigned Operations Pool */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <TechnicalLabel>Unassigned Operations ({unassignedTickets.length})</TechnicalLabel>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] scrollbar-thin pr-1">
            {unassignedTickets.length > 0 ? (
              unassignedTickets.slice(0, 8).map((issue) => {
                const projectIdentifier = (issue as any).project_detail?.identifier || activeProjectKey || 'TASK';
                const key = (issue as any).sequence_id ? `${projectIdentifier}-${(issue as any).sequence_id}` : issue.id;
                return (
                  <div
                    key={issue.id}
                    className="p-2.5 rounded-lg bg-[#10151C] border border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                        {key}
                      </span>
                      <button
                        onClick={() => handleClaimTicket(issue as any)}
                        className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                      >
                        [CLAIM]
                      </button>
                    </div>
                    <div
                      onClick={() => setSelectedIssueId(issue.id)}
                      className="text-xs text-[#FAFAFA] font-medium truncate cursor-pointer hover:text-cyan-300"
                    >
                      {(issue as any).name || (issue as any).title}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs font-mono text-[#52525B]">
                NO UNASSIGNED TICKETS IN POOL.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Work Item Detail Sheet */}
      <AnimatePresence>
        {selectedIssue && (
          <WorkItemDetailPanel
            key={selectedIssue.id}
            issue={selectedIssue as any}
            allIssues={issues as any}
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
