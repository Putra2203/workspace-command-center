'use client';

import { useState } from 'react';
import { Flame, CheckCircle2, Loader2, ArrowRight, Target } from 'lucide-react';
import { FocusIssue } from '@/domain/work_items/focus-queue';

interface FocusModeBannerProps {
  tasks: FocusIssue[];
  activeProjectKey: string | null;
  onTaskCompleted: () => void;
}

export function FocusModeBanner({ tasks, activeProjectKey, onTaskCompleted }: FocusModeBannerProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  if (tasks.length === 0) {
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

  const handleComplete = async (task: FocusIssue) => {
    setCompletingId(task.id);
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
      setCompletingId(null);
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-[#0B0F14] to-violet-950/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.05)] space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
          Primary Mission Queue
        </span>
        <span className="text-[10px] font-mono text-cyan-300/70">({tasks.length})</span>
      </div>

      <div className="space-y-1.5">
        {tasks.map((task, idx) => {
          const projectIdentifier = task.project_detail?.identifier || activeProjectKey || 'TASK';
          const issueKey = task.sequence_id ? `${projectIdentifier}-${task.sequence_id}` : task.id;
          const isCompleting = completingId === task.id;
          const isDisabled = completingId !== null;

          return (
            <div
              key={task.id}
              className="p-2 rounded-lg bg-[#0B0F14] border border-white/[0.06] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-mono font-bold text-[#52525B] shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {issueKey}
                    </span>
                    {task.priority && (
                      <span className="text-[9px] font-mono uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <h3
                    className="text-xs font-bold text-[#FAFAFA] mt-1 truncate"
                    title={task.name || task.title}
                  >
                    {task.name || task.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => handleComplete(task)}
                disabled={isDisabled}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-500 text-white font-mono font-medium text-[11px] flex items-center justify-center gap-1 transition-all shrink-0 disabled:opacity-50"
              >
                {isCompleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>Advance</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
