'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  UserX,
  TrendingUp,
  ShieldCheck,
  FolderKanban,
  Zap,
  PieChart as PieIcon,
  Activity,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PlaneIssue } from '@/types/plane';
import { PlaneStateLike } from '@/domain/work_items/my-day';
import { Project } from '@/lib/context/workspace-data';
import { calculateProjectHealth } from '@/domain/analytics/analytics-helper';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TechnicalLabel } from '@/components/ui/TechnicalLabel';

interface AnalyticsDashboardProps {
  activeProjectId?: string | null;
  activeProjectKey: string | null;
  projects?: Project[];
  issues: PlaneIssue[];
  states: PlaneStateLike[];
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#f43f5e', // rose-500
  high: '#f97316',   // orange-500
  medium: '#f59e0b', // amber-500
  low: '#38bdf8',    // cyan-400
  none: '#71717a',   // zinc-500
};

const STATE_COLORS: Record<string, string> = {
  Completed: '#10b981',   // emerald-500
  'In Progress': '#38bdf8', // cyan-400
  Unstarted: '#f59e0b',   // amber-500
  Backlog: '#71717a',     // zinc-500
};

// Sleek Custom Tooltip for Mission Control Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-[#0B0F14]/95 border border-white/[0.12] shadow-2xl backdrop-blur-md text-xs space-y-1.5 font-mono z-50">
        <div className="text-[10px] text-[#71717A] uppercase tracking-wider border-b border-white/[0.08] pb-1">
          {label ? `DATA POINT: ${label}` : 'METRIC TELEMETRY'}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-bold text-[#FAFAFA]">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function AnalyticsDashboard({
  activeProjectId,
  activeProjectKey,
  projects = [],
  issues,
  states,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  // Filter issues based on activeProjectId & activeProjectKey
  const filteredIssues = useMemo(() => {
    if (!activeProjectKey || activeProjectKey === 'ALL' || !activeProjectId || activeProjectId === 'ALL') {
      return issues;
    }
    const currentProj = projects.find(
      (p) => p.id === activeProjectId || p.identifier === activeProjectKey
    );
    const targetId = currentProj?.id || activeProjectId;
    const targetKey = currentProj?.identifier || activeProjectKey;

    const matched = issues.filter(
      (i) =>
        i.project === targetId ||
        i.project === targetKey ||
        (i as any).project_id === targetId ||
        (i as any).project_id === targetKey ||
        i.project_detail?.identifier === targetKey ||
        (i as any).project_detail?.id === targetId
    );

    // If context already contains issues for this active project, return issues directly
    return matched.length > 0 ? matched : issues;
  }, [issues, activeProjectId, activeProjectKey, projects]);

  const metrics = useMemo(
    () => calculateProjectHealth(filteredIssues, states),
    [filteredIssues, states]
  );

  // 1. Data for Priority Donut Chart
  const priorityChartData = useMemo(() => {
    const data = [
      { name: 'Urgent', value: metrics.priorityBreakdown.urgent, color: PRIORITY_COLORS.urgent },
      { name: 'High', value: metrics.priorityBreakdown.high, color: PRIORITY_COLORS.high },
      { name: 'Medium', value: metrics.priorityBreakdown.medium, color: PRIORITY_COLORS.medium },
      { name: 'Low', value: metrics.priorityBreakdown.low, color: PRIORITY_COLORS.low },
      { name: 'None', value: metrics.priorityBreakdown.none, color: PRIORITY_COLORS.none },
    ];
    return data.filter((d) => d.value > 0);
  }, [metrics]);

  // 2. Data for Task State Distribution Bar Chart
  const stateChartData = useMemo(() => {
    return [
      { state: 'Backlog', count: metrics.backlogIssues, fill: STATE_COLORS.Backlog },
      { state: 'Unstarted', count: metrics.unstartedIssues, fill: STATE_COLORS.Unstarted },
      { state: 'In Progress', count: metrics.inProgressIssues, fill: STATE_COLORS['In Progress'] },
      { state: 'Completed', count: metrics.completedIssues, fill: STATE_COLORS.Completed },
    ];
  }, [metrics]);

  // 3. Historical / Throughput Trend Curve
  const throughputTrendData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : 30;
    const result: { date: string; created: number; completed: number }[] = [];
    const now = new Date();

    const stateGroupMap = new Map<string, string>();
    if (states) {
      for (const s of states) {
        if (s.id) {
          stateGroupMap.set(s.id, s.group?.toLowerCase() || s.name.toLowerCase());
        }
      }
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        weekday: days === 7 ? 'short' : undefined,
      });

      let createdCount = 0;
      let completedCount = 0;

      for (const issue of filteredIssues) {
        if (issue.created_at && issue.created_at.slice(0, 10) === dateStr) {
          createdCount++;
        }
        const stateStr = typeof issue.state === 'string' ? issue.state : '';
        const group = (stateStr ? stateGroupMap.get(stateStr) : '') || stateStr.toLowerCase();
        if (
          (group === 'completed' || group === 'done') &&
          issue.updated_at &&
          issue.updated_at.slice(0, 10) === dateStr
        ) {
          completedCount++;
        }
      }

      result.push({
        date: label,
        created: createdCount,
        completed: completedCount,
      });
    }

    return result;
  }, [filteredIssues, states, timeRange]);

  // 4. Cross-Project Workload Breakdown Chart Data (When ALL projects is active)
  const crossProjectChartData = useMemo(() => {
    if (activeProjectKey !== 'ALL' || projects.length === 0) return [];
    return projects
      .map((p) => {
        const projIssues = issues.filter(
          (i) => i.project_detail?.identifier === p.identifier || i.project === p.id
        );
        const projHealth = calculateProjectHealth(projIssues, states);
        return {
          identifier: p.identifier,
          name: p.name,
          completed: projHealth.completedIssues,
          inProgress: projHealth.inProgressIssues,
          unstarted: projHealth.unstartedIssues,
          overdue: projHealth.overdueCount,
          total: projHealth.totalIssues,
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [activeProjectKey, projects, issues, states]);

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full scrollbar-thin space-y-4 bg-[#05070A] pb-20 md:pb-6">
      {/* Top Header Banner Card */}
      <div className="bg-[#0B0F14] border border-white/[0.06] p-3.5 sm:p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-[#FAFAFA]">
                  Project Health & Velocity
                </h2>
                <StatusIndicator status="online" label="TELEMETRY LIVE" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#71717A] font-mono mt-0.5 leading-snug">
                Operational velocity & health for{' '}
                <span className="text-cyan-400 font-semibold">
                  {activeProjectKey === 'ALL' ? 'All Workspace Projects' : activeProjectKey || 'Active Mission'}
                </span>
              </p>
            </div>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#10151C] border border-white/[0.08] shrink-0 self-start sm:self-auto">
            <ShieldCheck
              className={`w-4 h-4 ${
                metrics.healthStatus === 'Healthy'
                  ? 'text-emerald-400'
                  : metrics.healthStatus === 'At Risk'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            />
            <div className="text-[11px] font-mono font-bold">
              <span className="text-[#71717A]">HEALTH: </span>
              <span
                className={
                  metrics.healthStatus === 'Healthy'
                    ? 'text-emerald-400'
                    : metrics.healthStatus === 'At Risk'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {metrics.healthScore}% ({metrics.healthStatus})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Strip (Compact 2x2 on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Completion Rate */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            <span className="truncate">COMPLETION</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#FAFAFA]">
              {metrics.completionRate}%
            </span>
            <span className="text-[10px] text-[#71717A] font-mono truncate">
              ({metrics.completedIssues}/{metrics.totalIssues})
            </span>
          </div>
          <div className="w-full bg-[#10151C] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            <span className="truncate">IN PROGRESS</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
              {metrics.inProgressIssues}
            </span>
            <span className="text-[10px] text-[#71717A] font-mono">active tasks</span>
          </div>
          <div className="w-full bg-[#10151C] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{
                width: `${Math.min(100, (metrics.inProgressIssues / (metrics.totalIssues || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            <span className="truncate">OVERDUE</span>
            <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono ${
                metrics.overdueCount > 0 ? 'text-rose-400' : 'text-[#FAFAFA]'
              }`}
            >
              {metrics.overdueCount}
            </span>
            <span className="text-[10px] text-[#71717A] font-mono">critical</span>
          </div>
          <div className="w-full bg-[#10151C] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
              style={{
                width: `${Math.min(100, (metrics.overdueCount / (metrics.totalIssues || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Unassigned Pool */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            <span className="truncate">UNASSIGNED</span>
            <UserX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {metrics.unassignedCount}
            </span>
            <span className="text-[10px] text-[#71717A] font-mono">claimable</span>
          </div>
          <div className="w-full bg-[#10151C] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              style={{
                width: `${Math.min(100, (metrics.unassignedCount / (metrics.totalIssues || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* AI Key Insights Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/20 via-[#0B0F14] to-violet-950/20 border border-cyan-500/25 space-y-2.5">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold font-mono uppercase tracking-wider">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>AI Velocity & Operational Recommendations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-[#E4E4E7]">
          {metrics.keyInsights.map((insight, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#10151C] border border-white/[0.06] flex items-center gap-2"
            >
              <span className="text-cyan-400 font-bold">✦</span>
              <span className="text-[11px] leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CHART 1: Velocity & Throughput Trend Area Chart */}
      <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.04] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <TechnicalLabel>Task Throughput & Velocity Timeline</TechnicalLabel>
          </div>

          <div className="flex items-center p-0.5 bg-[#10151C] border border-white/[0.08] rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7d')}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                timeRange === '7d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                timeRange === '30d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughputTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed Tasks"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Created Tasks"
                stroke="#38BDF8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHARTS ROW 2: Priority Donut + Task State Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Distribution Donut Chart */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-orange-400" />
              <TechnicalLabel>Priority Breakdown</TechnicalLabel>
            </div>
            <span className="text-xs font-mono text-[#71717A]">
              Total: {metrics.totalIssues}
            </span>
          </div>

          <div className="h-56 sm:h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0B0F14" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-mono text-[#A1A1AA] capitalize">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task State Breakdown Bar Chart */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <TechnicalLabel>Task State Distribution</TechnicalLabel>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {metrics.completedIssues} Completed
            </span>
          </div>

          <div className="h-56 sm:h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="state" stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                  {stateChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 3: Cross-Project Workload Horizontal Stacked Chart (When ALL projects is active) */}
      {activeProjectKey === 'ALL' && crossProjectChartData.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <TechnicalLabel>Cross-Project Workload Comparison</TechnicalLabel>
            </div>
            <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              {crossProjectChartData.length} Projects
            </span>
          </div>

          {/* Clean HTML Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#A1A1AA] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8]" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" />
              <span>Unstarted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e]" />
              <span>Overdue</span>
            </div>
          </div>

          <div
            className="w-full"
            style={{ height: `${Math.max(200, crossProjectChartData.length * 44)}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={crossProjectChartData}
                margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#52525B"
                  tick={{ fontSize: 10, fill: '#71717A' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="identifier"
                  stroke="#52525B"
                  tick={{ fontSize: 10, fill: '#71717A' }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#38bdf8" />
                <Bar dataKey="unstarted" name="Unstarted" stackId="a" fill="#f59e0b" />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
