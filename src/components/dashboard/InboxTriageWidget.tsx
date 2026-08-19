'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Inbox, Loader2 } from 'lucide-react';
import { ActionPlanCard } from '@/components/ai/ActionCard';
import { ActionPlan } from '@/types/ai';

interface InboxItem {
  id: string;
  rawText: string;
  status: string;
  createdAt: string;
}

interface InboxTriageWidgetProps {
  activeProjectKey: string | null;
  onTaskConverted: () => void;
}

export function InboxTriageWidget({ activeProjectKey, onTaskConverted }: InboxTriageWidgetProps) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triagingId, setTriagingId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<{ itemId: string; plan: ActionPlan } | null>(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  async function fetchInbox() {
    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items.filter((i: InboxItem) => i.status === 'pending'));
      }
    } catch (err) {
      console.error('Failed to load inbox items:', err);
    }
  }

  const handleAddThought = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      if (res.ok) {
        setRawText('');
        fetchInbox();
      }
    } catch (err) {
      console.error('Failed to add inbox thought:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriage = async (item: InboxItem) => {
    setTriagingId(item.id);
    try {
      const targetProject = activeProjectKey === 'ALL' || !activeProjectKey ? 'PROJECT1' : activeProjectKey;
      const res = await fetch(`/api/inbox/${item.id}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: targetProject }),
      });

      if (res.ok) {
        const data = await res.json();
        setActivePlan({ itemId: item.id, plan: data.plan });
      }
    } catch (err) {
      console.error('Failed to triage inbox item:', err);
    } finally {
      setTriagingId(null);
    }
  };

  const handleApprovePlan = async (plan: ActionPlan) => {
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        setActivePlan(null);
        fetchInbox();
        onTaskConverted();
      }
    } catch (err) {
      console.error('Failed to execute triage plan:', err);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-[#111113] border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#FAFAFA]">
          <Inbox className="w-4 h-4 text-blue-400" />
          <span>Quick Thought Capture & AI Triage ({items.length})</span>
        </div>
      </div>

      <form onSubmit={handleAddThought} className="flex gap-2">
        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Dump a quick thought/note... (e.g. Need to update OAuth secrets next week)"
          className="flex-1 bg-[#18181B] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none"
        />
        <button
          type="submit"
          disabled={!rawText.trim() || isSubmitting}
          className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-white/10 hover:bg-[#27272A] text-xs text-[#FAFAFA] flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </form>

      {items.length > 0 && (
        <div className="space-y-2 pt-1">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="p-2.5 rounded-lg bg-[#18181B] border border-white/5 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#FAFAFA] truncate flex-1">{item.rawText}</span>
              <button
                onClick={() => handleTriage(item)}
                disabled={triagingId === item.id}
                className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
              >
                {triagingId === item.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>AI Triage to Task</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {activePlan && (
        <div className="pt-2 border-t border-white/5">
          <ActionPlanCard
            plan={activePlan.plan}
            onApprove={handleApprovePlan}
            onCancel={() => setActivePlan(null)}
          />
        </div>
      )}
    </div>
  );
}
