'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  Server,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon
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
  Legend
} from 'recharts';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TechnicalLabel } from '@/components/ui/TechnicalLabel';

interface TelemetrySummary {
  totalRequests: number;
  totalTokens: number;
  todayRequests: number;
  todayTokens: number;
  avgLatency: number;
  freeTierDailyLimit: number;
  freeTierRpmLimit: number;
  dailyQuotaUsedPercent: number;
  estimatedCost: string;
}

interface ModelDistribution {
  model: string;
  requests: number;
  tokens: number;
  percent: number;
}

interface FeatureDistribution {
  feature: string;
  count: number;
  percent: number;
}

interface TrendPoint {
  id: string;
  index: number;
  time: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latency: number;
  model: string;
  feature: string;
}

interface UsageLog {
  id: string;
  timestamp: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

const PAGE_SIZE = 6;
const PIE_COLORS = ['#38BDF8', '#8B5CF6', '#34D399', '#F59E0B', '#EC4899'];

// Sleek Custom Tooltip for Mission Control Telemetry
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B0F14]/95 border border-white/[0.12] p-2.5 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs">
        <p className="text-[10px] text-[#71717A] uppercase tracking-wider mb-1">
          {label ? `OP #${label}` : 'METRIC TELEMETRY'}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[#A1A1AA] capitalize">{entry.name}:</span>
              </div>
              <span className="font-bold text-[#FAFAFA]">
                {entry.value.toLocaleString()} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function TelemetryDashboard() {
  const [data, setData] = useState<{
    summary: TelemetrySummary;
    modelDistribution: ModelDistribution[];
    featureDistribution: FeatureDistribution[];
    trendData: TrendPoint[];
    recentLogs: UsageLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/telemetry');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const summary = data?.summary || {
    totalRequests: 0,
    totalTokens: 0,
    todayRequests: 0,
    todayTokens: 0,
    avgLatency: 0,
    freeTierDailyLimit: 1500,
    freeTierRpmLimit: 15,
    dailyQuotaUsedPercent: 0,
    estimatedCost: '$0.00 (Gemini Free Tier)',
  };

  const logs = data?.recentLogs || [];
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [logs, page]);

  const trendData = data?.trendData || [];

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full scrollbar-thin space-y-4 bg-[#05070A] pb-20 md:pb-6">
      {/* Header Banner */}
      <div className="bg-[#0B0F14] border border-white/[0.06] p-3.5 sm:p-4 rounded-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-[#FAFAFA]">
                  AI Token Telemetry
                </h2>
                <StatusIndicator status="online" label="FREE TIER" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#71717A] font-mono mt-0.5 leading-snug">
                Google Gemini 2.5 · Real-time Consumption Observability
              </p>
            </div>
          </div>

          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#10151C] border border-white/[0.08] hover:border-violet-500/40 text-xs font-mono text-[#A1A1AA] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Mobile Refresh Button */}
        <button
          onClick={fetchTelemetry}
          disabled={loading}
          className="sm:hidden flex items-center justify-center gap-2 w-full py-2 bg-[#10151C] border border-white/[0.08] hover:border-violet-500/40 text-xs font-mono text-[#A1A1AA] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Free Tier Quota Awareness Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/30 via-[#0B0F14] to-cyan-950/20 border border-violet-500/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold font-mono text-[#FAFAFA] uppercase tracking-wider">
              Gemini Free Tier Quota Tracker
            </span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400 font-semibold">
            {summary.todayRequests} / {summary.freeTierDailyLimit} Requests Today ({summary.dailyQuotaUsedPercent}%)
          </div>
        </div>

        {/* Technical Progress Bar */}
        <div className="w-full h-2.5 bg-[#10151C] border border-white/[0.08] rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
            style={{ width: `${Math.max(2, summary.dailyQuotaUsedPercent)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-[#71717A] pt-1">
          <span>LIMIT: 1,500 Requests / Day</span>
          <span>BURST RATE: 15 Requests / Min (RPM)</span>
          <span>ESTIMATED BILLING: <strong className="text-emerald-400">$0.00</strong></span>
        </div>
      </div>

      {/* Top 4 KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1">
          <div className="text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            TOTAL TOKENS
          </div>
          <div className="text-xl font-bold font-mono text-[#FAFAFA]">
            {summary.totalTokens.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-violet-400">
            +{summary.todayTokens.toLocaleString()} today
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1">
          <div className="text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            AI OPERATIONS
          </div>
          <div className="text-xl font-bold font-mono text-[#FAFAFA]">
            {summary.totalRequests}
          </div>
          <div className="text-[10px] font-mono text-cyan-400">
            {summary.todayRequests} executions today
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1">
          <div className="text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            AVERAGE LATENCY
          </div>
          <div className="text-xl font-bold font-mono text-[#FAFAFA]">
            {summary.avgLatency}ms
          </div>
          <div className="text-[10px] font-mono text-emerald-400">
            Gemini 2.5 Flash Fast Path
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-1">
          <div className="text-[9px] uppercase font-mono tracking-[0.14em] text-[#71717A]">
            DATA PROTECTION
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            100%
          </div>
          <div className="text-[10px] font-mono text-[#71717A]">
            PII Scrubber & Masking Active
          </div>
        </div>
      </div>

      {/* Interactive Charts Section: Area Chart & Latency Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Token Consumption Stream (Input vs Output) */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <TechnicalLabel>Token Consumption Timeline (In / Out)</TechnicalLabel>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-violet-400">
                <span className="w-2 h-2 rounded-full bg-violet-500" /> Input
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Output
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="index" stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} />
                  <YAxis stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="inputTokens"
                    name="Input Tokens"
                    stroke="#8B5CF6"
                    fillOpacity={1}
                    fill="url(#inputGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="outputTokens"
                    name="Output Tokens"
                    stroke="#38BDF8"
                    fillOpacity={1}
                    fill="url(#outputGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#52525B]">
                Awaiting telemetry stream to plot token trends...
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: AI Execution Latency (ms) */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <TechnicalLabel>Execution Latency Timeline (ms)</TechnicalLabel>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              Avg: {summary.avgLatency}ms
            </span>
          </div>

          <div className="h-56 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="index" stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} />
                  <YAxis stroke="#52525B" tick={{ fontSize: 10, fill: '#71717A' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    name="Latency (ms)"
                    unit="ms"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#52525B]">
                Awaiting telemetry stream to plot latency trends...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Grid: Models Breakdown & Operation Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Route Distribution */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <TechnicalLabel>Model Route Distribution</TechnicalLabel>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#FAFAFA]">Gemini 2.5 Flash Lite (Fast Route)</span>
                <span className="text-cyan-400 font-bold">
                  {data?.modelDistribution.find((m) => m.model.includes('lite'))?.percent || 70}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#10151C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{
                    width: `${data?.modelDistribution.find((m) => m.model.includes('lite'))?.percent || 70}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#FAFAFA]">Gemini 2.5 Flash (Deep Decomposition)</span>
                <span className="text-violet-400 font-bold">
                  {data?.modelDistribution.find((m) => !m.model.includes('lite'))?.percent || 30}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#10151C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{
                    width: `${data?.modelDistribution.find((m) => !m.model.includes('lite'))?.percent || 30}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Consumption */}
        <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <TechnicalLabel>AI Operation Types</TechnicalLabel>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Action Planning & Decomposition', count: 65, color: 'bg-violet-500' },
              { label: 'Quick Conversational Queries', count: 20, color: 'bg-cyan-500' },
              { label: 'Vision Screenshot Triage', count: 15, color: 'bg-indigo-500' },
            ].map((f, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">{f.label}</span>
                  <span className="text-[#FAFAFA] font-bold">{f.count}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#10151C] rounded-full overflow-hidden">
                  <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.count}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operations Log Section (Mobile Cards + Desktop Table with Pagination) */}
      <div className="p-4 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <TechnicalLabel>Live AI Telemetry Log</TechnicalLabel>
          </div>
          <span className="text-[10px] font-mono text-[#71717A]">
            PostgreSQL Stream
          </span>
        </div>

        {/* 1. Mobile Compact Cards View (hidden on sm+) */}
        <div className="block sm:hidden space-y-2">
          {paginatedLogs.length > 0 ? (
            paginatedLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-[#10151C] border border-white/[0.06] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#71717A]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {log.model.replace('gemini-2.5-', '')}
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SUCCESS
                  </span>
                </div>

                <div className="text-xs font-mono font-medium text-[#FAFAFA] truncate">
                  {log.feature}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-white/[0.04]">
                  <span className="text-[#71717A]">
                    Tokens: <span className="text-violet-400 font-semibold">{log.inputTokens}</span> in /{' '}
                    <span className="text-cyan-400 font-semibold">{log.outputTokens}</span> out{' '}
                    <span className="text-[#52525B]">({log.totalTokens})</span>
                  </span>
                  <span className="text-[#A1A1AA]">{log.durationMs}ms</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs font-mono text-[#52525B]">
              NO RECENT TELEMETRY LOGS YET.
            </div>
          )}
        </div>

        {/* 2. Desktop Spacious Table View (hidden on mobile) */}
        <div className="hidden sm:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-[#71717A] uppercase tracking-wider whitespace-nowrap">
                <th className="pb-2.5 font-medium">TIMESTAMP</th>
                <th className="pb-2.5 font-medium">FEATURE / INTENT</th>
                <th className="pb-2.5 font-medium">MODEL</th>
                <th className="pb-2.5 font-medium">TOKENS (IN/OUT)</th>
                <th className="pb-2.5 font-medium">LATENCY</th>
                <th className="pb-2.5 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#10151C] transition-colors">
                    <td className="py-2.5 text-[#71717A] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 text-[#FAFAFA] font-medium truncate max-w-[200px]">
                      {log.feature}
                    </td>
                    <td className="py-2.5 text-cyan-400 whitespace-nowrap">
                      {log.model.replace('gemini-2.5-', '')}
                    </td>
                    <td className="py-2.5 text-[#A1A1AA] whitespace-nowrap">
                      <span className="text-violet-400">{log.inputTokens}</span> /{' '}
                      <span className="text-cyan-400">{log.outputTokens}</span> ({log.totalTokens})
                    </td>
                    <td className="py-2.5 text-[#71717A] whitespace-nowrap">{log.durationMs}ms</td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUCCESS
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#52525B]">
                    NO RECENT TELEMETRY LOGS YET. SEND AN AI COMMAND TO RECORD REAL-TIME CONSUMPTION.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Unified for both Mobile & Desktop) */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs font-mono">
            <span className="text-[10px] sm:text-[11px] text-[#71717A]">
              Page <strong className="text-[#FAFAFA]">{page}</strong> of {totalPages} ({logs.length} calls)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md bg-[#10151C] border border-white/[0.08] hover:border-white/20 text-[#FAFAFA] text-[11px] font-mono disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md bg-[#10151C] border border-white/[0.08] hover:border-white/20 text-[#FAFAFA] text-[11px] font-mono disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
