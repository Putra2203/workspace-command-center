'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Info, AlertCircle, ListTodo, FileText, ShieldAlert, Play, X, Loader2, Pencil, Sparkles, Check } from 'lucide-react';
import { ActionPlan } from '@/types/ai';
import { ActionPlanSchema } from '@/types/schemas';

interface ActionCardProps {
  data: {
    type: 'issue_created' | 'issue_updated' | 'issue_list' | 'batch_issues_created' | 'error' | 'info';
    title?: string;
    message?: string;
    data?: any;
    items?: any[];
    [key: string]: any;
  };
}

interface ActionPlanCardProps {
  plan: ActionPlan;
  onApprove: (plan: ActionPlan) => Promise<void>;
  onCancel: () => void;
}

export function ActionPlanCard({ plan, onApprove, onCancel }: ActionPlanCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState<ActionPlan>(plan);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStepChange = useCallback((index: number, field: string, value: string) => {
    setEditedPlan((prev) => {
      const newSteps = [...prev.steps];
      if (field.startsWith('changes.')) {
        const changeKey = field.replace('changes.', '');
        newSteps[index] = {
          ...newSteps[index],
          changes: { ...newSteps[index].changes, [changeKey]: value },
        };
      } else {
        newSteps[index] = { ...newSteps[index], [field]: value };
      }
      return { ...prev, steps: newSteps };
    });
    setValidationError(null);
  }, []);

  const handleApprove = async () => {
    const activePlan = isEditing ? editedPlan : plan;
    const result = ActionPlanSchema.safeParse(activePlan);
    if (!result.success) {
      setValidationError('Mission Plan format is invalid. Please verify steps.');
      return;
    }
    setIsExecuting(true);
    setValidationError(null);
    try {
      await onApprove(result.data as ActionPlan);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelClick = () => {
    setIsCancelled(true);
    onCancel();
  };

  if (isCancelled) {
    return (
      <div className="p-3 rounded-xl border border-white/[0.06] bg-[#0B0F14] text-xs font-mono text-[#71717A] italic">
        MISSION PLAN CANCELLED BY OPERATOR.
      </div>
    );
  }

  const getRiskRender = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'high':
        return {
          label: 'HIGH RISK',
          dots: '● ● ●',
          class: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        };
      case 'medium':
        return {
          label: 'MEDIUM RISK',
          dots: '● ● ○',
          class: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      default:
        return {
          label: 'LOW RISK',
          dots: '● ○ ○',
          class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        };
    }
  };

  const activePlan = isEditing ? editedPlan : plan;
  const riskInfo = getRiskRender(activePlan.risk || 'low');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/[0.08] shadow-[0_0_25px_rgba(139,92,246,0.06)] my-3 w-full space-y-3"
    >
      {/* Workflow Phase Indicator */}
      <div className="flex items-center justify-between text-[9px] font-mono text-[#71717A] border-b border-violet-500/20 pb-2">
        <span className="flex items-center gap-1 text-violet-300">
          <Sparkles className="w-3 h-3 text-violet-400" />
          PROPOSED MISSION PLAN
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-violet-400">● ANALYZE</span>
          <span>─</span>
          <span className="text-violet-400">● PLAN</span>
          <span>─</span>
          <span className={isExecuting ? 'text-violet-400 font-bold animate-pulse' : 'text-violet-300 font-bold'}>
            ● REVIEW
          </span>
          <span>─</span>
          <span className={isExecuting ? 'text-cyan-400 font-bold animate-pulse' : 'text-[#52525B]'}>
            ○ EXECUTE
          </span>
        </div>
      </div>

      {/* Plan Summary Header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#FAFAFA]">{activePlan.summary}</div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1.5 ${riskInfo.class}`}>
              <span>{riskInfo.dots}</span>
              <span>{riskInfo.label}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setValidationError(null);
            }}
            disabled={isExecuting}
            className={`text-[10px] px-2.5 py-1 rounded border font-mono font-semibold flex items-center gap-1 transition-colors ${
              isEditing
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-[#10151C] border-white/[0.08] text-[#71717A] hover:text-[#FAFAFA]'
            }`}
          >
            <Pencil className="w-3 h-3" />
            {isEditing ? 'Editing' : 'Edit Plan'}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
          Operation Steps ({activePlan.steps.length}):
        </div>
        {activePlan.steps.map((step, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-lg bg-[#0B0F14] border text-xs space-y-1.5 ${
              isEditing ? 'border-violet-500/30' : 'border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between font-mono">
              <span className="text-violet-300 font-semibold text-[11px] flex items-center gap-1.5">
                <span className="text-[#52525B]">0{idx + 1}</span>
                <span>{step.operation}</span>
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={step.target}
                  onChange={(e) => handleStepChange(idx, 'target', e.target.value)}
                  className="text-[#FAFAFA] bg-[#10151C] px-2 py-0.5 rounded border border-violet-500/30 outline-none focus:border-violet-500 text-xs font-mono w-40"
                />
              ) : (
                <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-[10px]">
                  {step.target}
                </span>
              )}
            </div>

            {step.changes && Object.keys(step.changes).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                {Object.entries(step.changes).map(([k, v]) => (
                  <div
                    key={k}
                    className={`p-1.5 rounded border ${
                      isEditing ? 'bg-[#10151C] border-violet-500/20' : 'bg-[#10151C] border-white/[0.04]'
                    }`}
                  >
                    <span className="text-[#71717A] font-mono text-[10px] uppercase block">{k}:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={String(v)}
                        onChange={(e) => handleStepChange(idx, `changes.${k}`, e.target.value)}
                        className="text-[#FAFAFA] bg-[#05070A] px-1.5 py-0.5 rounded border border-violet-500/30 outline-none text-xs w-full mt-0.5"
                      />
                    ) : (
                      <span className="text-[#FAFAFA] font-medium block truncate mt-0.5">
                        {String(v)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {validationError && (
        <div className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-500/20">
        <button
          onClick={handleCancelClick}
          disabled={isExecuting}
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-mono font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={isExecuting}
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Mission...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Approve & Execute</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function ActionCard({ data }: ActionCardProps) {
  if (data.type === 'issue_created') {
    return (
      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1 my-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>MISSION OPERATION CREATED</span>
        </div>
        <div className="text-[#FAFAFA] font-medium">{data.title || data.message}</div>
      </div>
    );
  }

  if (data.type === 'batch_issues_created') {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-2 my-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>BATCH OPERATIONS EXECUTED ({data.items?.length || 0})</span>
        </div>
        <div className="text-[#FAFAFA]">{data.message}</div>
        {data.items && data.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-emerald-500/20">
            {data.items.map((it: any, i: number) => (
              <div key={i} className="font-mono text-[11px] text-emerald-300/90 flex items-center gap-1.5">
                <span>✓</span>
                <span>{it.name || it.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'error') {
    return (
      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs space-y-1 my-2">
        <div className="flex items-center gap-1.5 text-rose-400 font-mono font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>SYSTEM INTERRUPTION</span>
        </div>
        <div className="text-[#FAFAFA]">{data.message || 'Operation failed.'}</div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] text-xs space-y-1 my-2">
      <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
        <Info className="w-4 h-4" />
        <span>SYSTEM OBSERVATION</span>
      </div>
      <div className="text-[#FAFAFA]">{data.message || data.title}</div>
    </div>
  );
}
