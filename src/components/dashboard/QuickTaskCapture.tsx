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
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2 bg-[#111113] border border-white/10 p-1.5 rounded-xl focus-within:border-blue-500/50 transition-colors">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quick add a task..."
        className="min-w-0 flex-1 bg-transparent border-none outline-none text-xs text-[#FAFAFA] placeholder-[#71717A] px-1.5 sm:px-2"
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="bg-[#18181B] border border-white/10 text-[10px] sm:text-[11px] text-[#A1A1AA] rounded-lg px-1.5 sm:px-2 py-1 outline-none font-mono capitalize shrink-0"
      >
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <button
        type="submit"
        disabled={!title.trim() || isSubmitting}
        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
      >
        {isSubmitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </>
        )}
      </button>
    </form>
  );
}
