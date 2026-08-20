'use client';

import { useState } from 'react';
import { Flame, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { FocusIssue } from '@/domain/work_items/focus-queue';

interface FocusModeBannerProps {
  task: FocusIssue | null;
  activeProjectKey: string | null;
  onTaskCompleted: () => void;
}

export function FocusModeBanner({ task, activeProjectKey, onTaskCompleted }: FocusModeBannerProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  if (!task) {
    return (
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/30 border border-blue-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-blue-400 font-semibold">Focus Queue Mode</div>
            <div className="text-xs font-semibold text-[#FAFAFA] mt-0.5">Semua task prioritas telah selesai! 🎉</div>
          </div>
        </div>
      </div>
    );
  }

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch('/api/focus/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: task.id,
          projectId: task.project_detail?.identifier || activeProjectKey || 'PROJECT',
        }),
      });
      if (res.ok) {
        onTaskCompleted();
      }
    } catch (err) {
      console.error('Failed to complete focus task:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const projectIdentifier = task.project_detail?.identifier || activeProjectKey || 'TASK';
  const issueKey = task.sequence_id ? `${projectIdentifier}-${task.sequence_id}` : task.id;

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#111113] to-purple-950/40 border border-blue-500/30 shadow-lg relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">
                Fokus Utama #1
              </span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {issueKey}
              </span>
              {task.priority && (
                <span className="text-[10px] font-mono uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {task.priority}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-[#FAFAFA] mt-1 truncate" title={task.name || task.title}>
              {task.name || task.title}
            </h3>
          </div>
        </div>

        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Mark Done & Advance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
