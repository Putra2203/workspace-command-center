'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Info,
  AlertCircle,
  ListTodo,
  FileText,
  ShieldAlert,
  Play,
  X,
  Loader2,
  Pencil,
  Sparkles,
  Check,
  ArrowUpRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { ActionPlan } from '@/types/ai';
import { ActionPlanSchema } from '@/types/schemas';

interface ActionCardProps {
  data: {
    type: 'issue_created' | 'issue_updated' | 'issue_list' | 'batch_issues_created' | 'clarification' | 'operation_receipt' | 'error' | 'info';
    title?: string;
    message?: string;
    data?: any;
    items?: any[];
    [key: string]: any;
  };
  onOpenIssue?: (issueKey: string, projectId?: string) => void;
  onSelectOption?: (option: { label: string; value: string; action?: string }) => void;
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
      {/* Workflow Phase Indicator (v2 Lifecycle) */}
      <div className="flex items-center justify-between text-[9px] font-mono text-[#71717A] border-b border-violet-500/20 pb-2">
        <span className="flex items-center gap-1 text-violet-300 font-semibold">
          <Sparkles className="w-3 h-3 text-violet-400" />
          PROPOSED MISSION PLAN
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
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
          <span>─</span>
          <span className="text-[#52525B]">○ VERIFY</span>
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
              <span>Executing & Verifying...</span>
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

export function ActionCard({ data, onOpenIssue, onSelectOption }: ActionCardProps) {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const handleQuickComplete = async (issueKey: string, projectId?: string) => {
    setLoadingItems((prev) => ({ ...prev, [issueKey]: true }));
    try {
      const res = await fetch(
        `/api/plane?action=updateIssue&projectId=${encodeURIComponent(projectId || 'ALL')}&issueId=${encodeURIComponent(issueKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: projectId || 'ALL', issueId: issueKey, state: 'Done' }),
        }
      );
      if (res.ok) {
        setCompletedItems((prev) => ({ ...prev, [issueKey]: true }));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingItems((prev) => ({ ...prev, [issueKey]: false }));
    }
  };

  // 1. Issue List Card
  if (data.type === 'issue_list') {
    const items = data.data?.items || data.items || [];
    const projectId = data.data?.projectId || 'ALL';

    return (
      <div className="p-4 rounded-xl bg-[#070A0E] border border-cyan-500/20 shadow-[0_0_20px_rgba(56,189,248,0.04)] my-3 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-cyan-400">
              {data.title || `Task Queue (${items.length})`}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#71717A]">
            0-TOKEN ACTIVE HUD
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-4 text-center font-mono text-xs text-[#71717A] italic bg-[#0B0F14] rounded-lg border border-white/[0.04]">
            No matching tasks found for this query.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any, idx: number) => {
              const isDone = completedItems[item.key] || item.state?.toLowerCase() === 'done';
              const isLoading = loadingItems[item.key];

              const getPrioColor = (prio: string) => {
                switch (prio?.toLowerCase()) {
                  case 'urgent': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  case 'medium': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                  default: return 'text-[#71717A] bg-white/[0.04] border-white/[0.06]';
                }
              };

              return (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-lg border transition-all ${
                    isDone
                      ? 'bg-emerald-950/10 border-emerald-500/20 opacity-75'
                      : 'bg-[#0B0F14] hover:bg-[#10151C] border-white/[0.06] hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenIssue?.(item.key, projectId)}
                          className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-0.5"
                        >
                          <span>{item.key}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </button>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold ${getPrioColor(item.priority)}`}>
                          {item.priority || 'none'}
                        </span>
                        <span className="text-[9px] font-mono text-[#71717A] truncate">
                          • {item.assignee || 'Unassigned'}
                        </span>
                      </div>
                      <div className={`text-xs font-medium truncate ${isDone ? 'line-through text-[#71717A]' : 'text-[#FAFAFA]'}`}>
                        {item.title}
                      </div>
                    </div>

                    {/* Quick Inline Actions (0 Tokens) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onOpenIssue?.(item.key, projectId)}
                        className="px-2 py-1 rounded bg-[#10151C] hover:bg-[#18202B] border border-white/[0.08] text-[10px] font-mono text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleQuickComplete(item.key, projectId)}
                        disabled={isDone || isLoading}
                        className={`px-2 py-1 rounded border text-[10px] font-mono font-medium flex items-center gap-1 transition-colors ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                        ) : isDone ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Done</span>
                          </>
                        ) : (
                          <span>Complete</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. Clarification / Disambiguation Card
  if (data.type === 'clarification') {
    const options = data.data?.options || [];
    return (
      <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5 my-2">
        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-semibold">
          <HelpCircle className="w-4 h-4" />
          <span>CLARIFICATION REQUIRED</span>
        </div>
        <div className="text-xs text-[#E4E4E7]">{data.message || data.title}</div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {options.map((opt: any, i: number) => (
              <button
                key={i}
                onClick={() => onSelectOption?.(opt)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono transition-colors"
              >
                {opt.label || opt.value}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Issue Created Confirmation
  if (data.type === 'issue_created') {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1 my-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>MISSION OPERATION CREATED</span>
        </div>
        <div className="text-[#FAFAFA] font-medium">{data.title || data.message}</div>
      </div>
    );
  }

  // 4. Issue Updated / Verified Operation Receipt
  if (data.type === 'issue_updated' || data.type === 'operation_receipt') {
    return (
      <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-1 my-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{data.title || '✓ OPERATION VERIFIED'}</span>
        </div>
        <div className="text-[#FAFAFA] font-medium">{data.message || data.data?.message}</div>
      </div>
    );
  }

  // 5. Batch Created
  if (data.type === 'batch_issues_created') {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-2 my-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>BATCH OPERATIONS EXECUTED ({data.items?.length || data.data?.items?.length || 0})</span>
        </div>
        <div className="text-[#FAFAFA]">{data.title || data.message}</div>
        {data.data?.items && data.data.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-emerald-500/20">
            {data.data.items.map((it: any, i: number) => (
              <div key={i} className="font-mono text-[11px] text-emerald-300/90 flex items-center gap-1.5">
                <span>✓</span>
                <span>{it.name || it.title || it.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 6. Error
  if (data.type === 'error') {
    return (
      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs space-y-1 my-2">
        <div className="flex items-center gap-1.5 text-rose-400 font-mono font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>SYSTEM INTERRUPTION</span>
        </div>
        <div className="text-[#FAFAFA]">{data.message || data.data?.message || 'Operation failed.'}</div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] text-xs space-y-1 my-2">
      <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
        <Info className="w-4 h-4" />
        <span>SYSTEM OBSERVATION</span>
      </div>
      <div className="text-[#FAFAFA]">{data.message || data.title}</div>
    </div>
  );
}
