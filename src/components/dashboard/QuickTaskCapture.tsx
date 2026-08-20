'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface QuickTaskCaptureProps {
  activeProjectKey: string | null;
  onTaskCreated: () => void;
}

export function QuickTaskCapture({ activeProjectKey, onTaskCreated }: QuickTaskCaptureProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetProject = activeProjectKey === 'ALL' || !activeProjectKey ? 'PROJECT1' : activeProjectKey;
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `buat task ${title.trim()} dengan priority ${priority} di ${targetProject}`,
          projectId: targetProject,
        }),
      });

      const data = await res.json();
      if (data.plan) {
        // Execute the plan immediately
        await fetch('/api/ai/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: data.plan }),
        });
      }

      setTitle('');
      onTaskCreated();
    } catch (err) {
      console.error('Failed to quick-add task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2 bg-[#0B0F14] border border-white/[0.08] p-1.5 rounded-xl focus-within:border-cyan-400/50 transition-colors shadow-sm">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="+ Capture new operation / task..."
        className="min-w-0 flex-1 bg-transparent border-none outline-none text-xs text-[#FAFAFA] placeholder-[#71717A] px-2 font-mono"
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="bg-[#10151C] border border-white/[0.08] text-[10px] sm:text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1 outline-none font-mono capitalize shrink-0 cursor-pointer"
      >
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <button
        type="submit"
        disabled={!title.trim() || isSubmitting}
        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
      >
        {isSubmitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capture</span>
            <span className="sm:hidden">Add</span>
          </>
        )}
      </button>
    </form>
  );
}
