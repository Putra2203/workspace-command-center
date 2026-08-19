'use client';

import { useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  UserX,
  TrendingUp,
  ShieldCheck,
  FolderKanban,
  Zap,
} from 'lucide-react';
import { PlaneIssue } from '@/types/plane';
import { PlaneStateLike } from '@/domain/work_items/my-day';
import { Project } from '@/lib/context/workspace-data';
import { calculateProjectHealth } from '@/domain/analytics/analytics-helper';

interface AnalyticsDashboardProps {
  activeProjectKey: string | null;
  projects?: Project[];
  issues: PlaneIssue[];
  states: PlaneStateLike[];
}

export function AnalyticsDashboard({
  activeProjectKey,
  projects = [],
  issues,
  states,
}: AnalyticsDashboardProps) {
  // Filter issues based on activeProjectKey
  const filteredIssues = useMemo(() => {
    if (!activeProjectKey || activeProjectKey === 'ALL') return issues;
    return issues.filter(
      (i) =>
        i.project_detail?.identifier === activeProjectKey ||
        i.project === activeProjectKey ||
        (i as any).project_id === activeProjectKey
    );
  }, [issues, activeProjectKey]);

  const metrics = useMemo(
    () => calculateProjectHealth(filteredIssues, states),
    [filteredIssues, states]
  );

  // Calculate per-project breakdown when ALL projects is active
  const projectBreakdown = useMemo(() => {
    if (activeProjectKey !== 'ALL' || projects.length === 0) return [];
    return projects.map((p) => {
      const projIssues = issues.filter(
        (i) => i.project_detail?.identifier === p.identifier || i.project === p.id
      );
      const projHealth = calculateProjectHealth(projIssues, states);
      return {
        project: p,
        metrics: projHealth,
      };
    });
  }, [activeProjectKey, projects, issues, states]);

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#FAFAFA]">Project Health & Velocity Analytics</h2>
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Real-time Sync
            </span>
          </div>
          <p className="text-xs text-[#71717A] mt-1">
            Analyzing operational health and task throughput for{' '}
            <span className="font-mono text-blue-400 font-semibold">
              {activeProjectKey === 'ALL' ? 'All Workspace Projects' : activeProjectKey || 'Active Project'}
            </span>
          </p>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-3 bg-[#111113] border border-white/10 px-4 py-2 rounded-2xl shadow-sm shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-[#71717A]">Health Score</div>
            <div
              className={`text-sm font-bold font-mono ${
                metrics.healthStatus === 'Healthy'
                  ? 'text-emerald-400'
                  : metrics.healthStatus === 'At Risk'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {metrics.healthScore}% • {metrics.healthStatus}
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              metrics.healthStatus === 'Healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : metrics.healthStatus === 'At Risk'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Top Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completion Rate */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#FAFAFA]">{metrics.completionRate}%</span>
            <span className="text-xs text-[#71717A] font-mono">
              ({metrics.completedIssues}/{metrics.totalIssues})
            </span>
          </div>
          <div className="w-full bg-[#18181B] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: In Progress & Started */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span>In Active Progress</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-400">{metrics.inProgressIssues}</span>
            <span className="text-xs text-[#71717A]">work items</span>
          </div>
          <p className="text-[11px] text-[#71717A]">Currently being executed by team</p>
        </div>

        {/* Card 3: Overdue Tasks */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span>Overdue Tasks</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                metrics.overdueCount > 0 ? 'text-rose-400' : 'text-[#FAFAFA]'
              }`}
            >
              {metrics.overdueCount}
            </span>
            <span className="text-xs text-[#71717A]">tasks past due</span>
          </div>
          <p className="text-[11px] text-[#71717A]">Requires immediate scheduling</p>
        </div>

        {/* Card 4: Unassigned Pool */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span>Unassigned Tickets</span>
            <UserX className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{metrics.unassignedCount}</span>
            <span className="text-xs text-[#71717A]">claimable tickets</span>
          </div>
          <p className="text-[11px] text-[#71717A]">Available in Ticket Pool</p>
        </div>
      </div>

      {/* AI Key Insights Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#111113] to-purple-950/40 border border-blue-500/30 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold font-mono uppercase tracking-wider">
          <Zap className="w-4 h-4 text-blue-400" />
          <span>AI Operational Health & Recommendations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#E4E4E7]">
          {metrics.keyInsights.map((insight, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-[#18181B]/80 border border-white/5 flex items-center gap-2">
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Distribution & Work State Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown Card */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Priority Distribution</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Urgent
              </span>
              <span className="font-mono text-[#FAFAFA] font-bold">{metrics.priorityBreakdown.urgent}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-orange-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> High
              </span>
              <span className="font-mono text-[#FAFAFA] font-bold">{metrics.priorityBreakdown.high}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
              </span>
              <span className="font-mono text-[#FAFAFA] font-bold">{metrics.priorityBreakdown.medium}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Low
              </span>
              <span className="font-mono text-[#FAFAFA] font-bold">{metrics.priorityBreakdown.low}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#71717A] font-medium">
                <span className="w-2 h-2 rounded-full bg-zinc-600" /> None
              </span>
              <span className="font-mono text-[#FAFAFA] font-bold">{metrics.priorityBreakdown.none}</span>
            </div>
          </div>
        </div>

        {/* Work State Status Breakdown Card */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Task State Breakdown</span>
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#71717A]">
                <span>Completed</span>
                <span className="text-emerald-400 font-mono font-semibold">{metrics.completedIssues}</span>
              </div>
              <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{
                    width: `${metrics.totalIssues ? (metrics.completedIssues / metrics.totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#71717A]">
                <span>In Progress</span>
                <span className="text-blue-400 font-mono font-semibold">{metrics.inProgressIssues}</span>
              </div>
              <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{
                    width: `${metrics.totalIssues ? (metrics.inProgressIssues / metrics.totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#71717A]">
                <span>Unstarted</span>
                <span className="text-amber-400 font-mono font-semibold">{metrics.unstartedIssues}</span>
              </div>
              <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${metrics.totalIssues ? (metrics.unstartedIssues / metrics.totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#71717A]">
                <span>Backlog</span>
                <span className="text-zinc-400 font-mono font-semibold">{metrics.backlogIssues}</span>
              </div>
              <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-zinc-600 h-full"
                  style={{
                    width: `${metrics.totalIssues ? (metrics.backlogIssues / metrics.totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Projects Breakdown Table (When Scope is ALL) */}
      {activeProjectKey === 'ALL' && projectBreakdown.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            <span>Cross-Project Health Comparison</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectBreakdown.map(({ project, metrics: pm }) => (
              <div
                key={project.id}
                className="p-4 rounded-xl bg-[#18181B] border border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {project.identifier}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      pm.healthStatus === 'Healthy'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : pm.healthStatus === 'At Risk'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {pm.healthScore}%
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[#FAFAFA] truncate">{project.name}</h4>
                  <p className="text-[11px] text-[#71717A] mt-0.5">
                    {pm.completedIssues} of {pm.totalIssues} tasks completed
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#71717A]">
                    <span>Completion Rate</span>
                    <span className="text-blue-400">{pm.completionRate}%</span>
                  </div>
                  <div className="w-full bg-[#111113] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${pm.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
