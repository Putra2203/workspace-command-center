'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import type { ActionPlan } from '@/types/ai';

interface IssueLookup {
  key: string;
  title: string;
}

interface BulkActionPreviewProps {
  plan: ActionPlan;
  /** Human-readable key/title per issue id, for display — the plan itself only carries ids */
  issueLookup: Map<string, IssueLookup>;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function BulkActionPreview({ plan, issueLookup, onConfirm, onCancel, isApplying = false }: BulkActionPreviewProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-[#09090B]/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-[#FAFAFA]">Confirm bulk action</h3>
              <p className="text-xs text-[#71717A] mt-0.5">{plan.summary}</p>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#18181B] hover:text-[#FAFAFA] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {plan.steps.map(step => {
              const info = issueLookup.get(step.target);
              const before = String(step.before?.priority ?? '—');
              const after = String(step.after?.priority ?? '—');
              return (
                <div key={step.target} className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181B] border border-white/5">
                  <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                    <span className="text-xs text-[#71717A] font-mono shrink-0">{info?.key || step.target}</span>
                    <span className="text-xs text-[#A1A1AA] truncate">{info?.title || ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-[#27272A] text-[#A1A1AA] capitalize">{before}</span>
                    <ArrowRight className="w-3 h-3 text-[#52525B]" />
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 capitalize font-medium">{after}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
            <button
              onClick={onCancel}
              disabled={isApplying}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isApplying}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {isApplying ? 'Applying…' : `Apply to ${plan.steps.length} issue${plan.steps.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
