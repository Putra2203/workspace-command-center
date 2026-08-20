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
  Layers
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

interface AnalyticsDashboardProps {
  activeProjectKey: string | null;
  projects?: Project[];
  issues: PlaneIssue[];
  states: PlaneStateLike[];
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#f43f5e', // rose-500
  high: '#f97316',   // orange-500
  medium: '#f59e0b', // amber-500
  low: '#3b82f6',    // blue-500
  none: '#71717a',   // zinc-500
};

const STATE_COLORS: Record<string, string> = {
  Completed: '#10b981',  // emerald-500
  'In Progress': '#3b82f6', // blue-500
  Unstarted: '#f59e0b',  // amber-500
  Backlog: '#71717a',    // zinc-500
};

// Sleek Custom Tooltip for Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-[#111113]/95 border border-white/10 shadow-2xl backdrop-blur-md text-xs space-y-1 z-50">
        <div className="font-semibold text-[#FAFAFA] border-b border-white/10 pb-1 font-mono">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-[#FAFAFA]">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function AnalyticsDashboard({
  activeProjectKey,
  projects = [],
  issues,
  states,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

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

  // 3. Historical / Throughput Trend Curve (Dynamic bucketing from issue timestamps)
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
    return projects.map((p) => {
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
    });
  }, [activeProjectKey, projects, issues, states]);

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full scrollbar-thin space-y-6 pb-20 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#FAFAFA]">Project Health & Velocity Analytics</h2>
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Live Metrics
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

      {/* Top Metric Cards Grid: Compact 2x2 on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Completion Rate */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111113] border border-white/5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#71717A]">
            <span className="truncate">Completion Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#FAFAFA]">{metrics.completionRate}%</span>
            <span className="text-[10px] sm:text-xs text-[#71717A] font-mono truncate">
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

        {/* Active In Progress */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111113] border border-white/5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#71717A]">
            <span className="truncate">In Progress</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-400">{metrics.inProgressIssues}</span>
            <span className="text-[10px] sm:text-xs text-[#71717A]">tasks</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#71717A] truncate hidden sm:block">Currently being executed</p>
        </div>

        {/* Overdue */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111113] border border-white/5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#71717A]">
            <span className="truncate">Overdue Tasks</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span
              className={`text-xl sm:text-2xl font-bold font-mono ${
                metrics.overdueCount > 0 ? 'text-rose-400' : 'text-[#FAFAFA]'
              }`}
            >
              {metrics.overdueCount}
            </span>
            <span className="text-[10px] sm:text-xs text-[#71717A]">overdue</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#71717A] truncate hidden sm:block">Requires scheduling</p>
        </div>

        {/* Unassigned Pool */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111113] border border-white/5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#71717A]">
            <span className="truncate">Unassigned</span>
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{metrics.unassignedCount}</span>
            <span className="text-[10px] sm:text-xs text-[#71717A]">claimable</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#71717A] truncate hidden sm:block">Available in Pool</p>
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

      {/* CHART 1: Velocity & Throughput Trend Area Chart */}
      <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Task Throughput & Velocity Trend</h3>
          </div>

          <div className="flex items-center p-0.5 bg-[#18181B] border border-white/10 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7d')}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                timeRange === '7d' ? 'bg-blue-600 text-white shadow-sm' : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                timeRange === '30d' ? 'bg-blue-600 text-white shadow-sm' : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughputTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed Tasks"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Created Tasks"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHARTS ROW 2: Priority Donut + Task State Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution Donut Chart */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-orange-400" />
              <span>Priority Breakdown</span>
            </h3>
            <span className="text-xs font-mono text-[#71717A]">
              Total: {metrics.totalIssues}
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#111113" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-[#A1A1AA] capitalize">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task State Breakdown Bar Chart */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Task State Distribution</span>
            </h3>
            <span className="text-xs font-mono text-[#71717A]">
              {metrics.completedIssues} Done
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="state" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
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

      {/* CHART 3: Cross-Project Workload Stacked Chart (When ALL projects is active) */}
      {activeProjectKey === 'ALL' && crossProjectChartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Cross-Project Workload & Throughput Comparison</span>
            </h3>
            <span className="text-xs font-mono text-blue-400">
              {crossProjectChartData.length} Projects
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crossProjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="identifier"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-[#A1A1AA] capitalize">{value}</span>}
                />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3b82f6" />
                <Bar dataKey="unstarted" name="Unstarted" stackId="a" fill="#f59e0b" />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
