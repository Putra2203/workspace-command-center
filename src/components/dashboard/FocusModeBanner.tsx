'use client';

import { useState } from 'react';
import { Flame, CheckCircle2, Loader2, ArrowRight, Target } from 'lucide-react';
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
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/20 via-[#0B0F14] to-violet-950/20 border border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Primary Mission Queue
            </div>
            <div className="text-xs font-semibold text-[#FAFAFA] mt-0.5">
              All prioritized operations completed! Mission queue is clear.
            </div>
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
    <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-[#0B0F14] to-violet-950/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.05)] relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Primary Mission #1
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
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
          className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Advance Mission</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
