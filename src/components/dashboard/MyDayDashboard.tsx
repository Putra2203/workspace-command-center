'use client';

import { useMemo } from 'react';
import { Activity, AlertTriangle, Ban, CalendarClock, Flame } from 'lucide-react';
import { computeMyDayBuckets, type PlaneStateLike, type WorkItemLike } from '@/domain/work_items/my-day';
import { scoreTask } from '@/domain/work_items/scoring';

interface Issue extends WorkItemLike {
  name: string;
  sequence_id: number;
  priority?: string;
  project_detail?: { identifier: string };
}

interface MyDayDashboardProps {
  issues: Issue[];
  states: PlaneStateLike[];
  currentUserId: string | null;
  activeProjectKey: string | null;
}

export function MyDayDashboard({ issues, states, currentUserId, activeProjectKey }: MyDayDashboardProps) {
  const { metrics, dueTodayIssues, overdueIssues, blockedIssues, activeIssues } = useMemo(
    () => computeMyDayBuckets(issues, states, currentUserId),
    [issues, states, currentUserId]
  );

  // Note: blockerCount is always 0 here — Plane issue relations (which
  // other issues this one blocks) aren't fetched anywhere in this app yet.
  // Scoring still ranks correctly on urgency + priority alone.
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

  if (!currentUserId) {
    return (
      <div className="p-6 flex items-center justify-center h-full text-sm text-[#71717A]">
        Resolving your account…
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#FAFAFA]">My Day</h2>
        <p className="text-xs text-[#71717A] mt-1">
          Your tasks in <span className="font-mono text-blue-400">{activeProjectKey || 'this project'}</span> — no AI involved, just direct queries.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-4 rounded-xl bg-[#111113] border border-white/5">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-semibold text-[#FAFAFA]">{card.value}</div>
              <div className="text-xs text-[#71717A] mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">Recommended Next</h3>
        {recommended.length === 0 ? (
          <p className="text-xs text-[#52525B] px-1">Nothing active to work on.</p>
        ) : (
          <div className="space-y-1.5">
            {recommended.map((issue, i) => (
              <div key={issue.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 transition-colors">
                <Flame className={`w-3.5 h-3.5 shrink-0 ${i === 0 ? 'text-orange-400' : 'text-[#52525B]'}`} />
                <span className="text-xs text-[#71717A] font-mono shrink-0">
                  {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
                </span>
                <span className="text-sm text-[#FAFAFA] truncate">{issue.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <IssueBucket title="Due Today" issues={dueTodayIssues} activeProjectKey={activeProjectKey} emptyText="Nothing due today." />
      <IssueBucket title="Overdue" issues={overdueIssues} activeProjectKey={activeProjectKey} emptyText="Nothing overdue." />
      <IssueBucket title="Blocked" issues={blockedIssues} activeProjectKey={activeProjectKey} emptyText="Nothing blocked." />
    </div>
  );
}

function IssueBucket({
  title,
  issues,
  activeProjectKey,
  emptyText,
}: {
  title: string;
  issues: Issue[];
  activeProjectKey: string | null;
  emptyText: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{title} ({issues.length})</h3>
      {issues.length === 0 ? (
        <p className="text-xs text-[#52525B] px-1">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {issues.map(issue => (
            <div key={issue.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 transition-colors">
              <span className="text-xs text-[#71717A] font-mono shrink-0">
                {issue.project_detail?.identifier || activeProjectKey}-{issue.sequence_id}
              </span>
              <span className="text-sm text-[#FAFAFA] truncate">{issue.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
