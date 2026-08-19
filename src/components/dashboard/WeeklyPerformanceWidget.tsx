'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { WeeklyReview } from '@/application/services/InsightService';

interface WeeklyPerformanceWidgetProps {
  activeProjectId: string | null;
}

export function WeeklyPerformanceWidget({ activeProjectId }: WeeklyPerformanceWidgetProps) {
  const [data, setData] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProjectId) return;
    let isMounted = true;

    async function loadWeekly() {
      setLoading(true);
      try {
        const projectId = activeProjectId === 'ALL' ? 'PROJECT1' : activeProjectId;
        const res = await fetch(`/api/insights/weekly?projectId=${projectId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
        }
      } catch (err) {
        console.error('Failed to load weekly review:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadWeekly();
    return () => { isMounted = false; };
  }, [activeProjectId]);

  if (loading || !data) return null;

  const { completed7Days, created7Days, blockedCount } = data.metrics;
  const total7Days = completed7Days + created7Days || 1;
  const completionRate = Math.round((completed7Days / total7Days) * 100);

  return (
    <div className="mb-6 p-4 rounded-xl bg-[#111113] border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#FAFAFA]">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span>Performa & Kecepatan 7 Hari Terakhir</span>
        </div>
        <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
          {completionRate}% Completion Velocity
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#18181B] h-2 rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 h-full transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#18181B] border border-white/5">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <div>
            <div className="text-[10px] text-[#71717A]">Done (7 Hari)</div>
            <div className="font-semibold text-[#FAFAFA] font-mono">{completed7Days}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#18181B] border border-white/5">
          <PlusCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div>
            <div className="text-[10px] text-[#71717A]">Dibuat (7 Hari)</div>
            <div className="font-semibold text-[#FAFAFA] font-mono">{created7Days}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#18181B] border border-white/5">
          <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <div>
            <div className="text-[10px] text-[#71717A]">Terhambat</div>
            <div className="font-semibold text-[#FAFAFA] font-mono">{blockedCount}</div>
          </div>
        </div>
      </div>

      {data.summary && (
        <p className="text-xs text-[#A1A1AA] italic pt-1 border-t border-white/5">
          "{data.summary}"
        </p>
      )}
    </div>
  );
}
