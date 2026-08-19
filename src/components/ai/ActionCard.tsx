'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Info, AlertCircle, ListTodo, FileText, ShieldAlert, Play, X, Loader2 } from 'lucide-react';
import { ActionPlan } from '@/types/ai';

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

  const handleApprove = async () => {
    setIsExecuting(true);
    try {
      await onApprove(plan);
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
      <div className="p-3 rounded-xl border border-white/10 bg-[#111113] text-xs text-[#71717A] italic">
        Rencana tindakan dibatalkan oleh pengguna.
      </div>
    );
  }

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-green-500/10 border-green-500/30 text-green-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-md my-2 w-full space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Persetujuan Tindakan {plan.risk && `(${plan.risk} risk)`}
            </div>
            <div className="text-sm font-semibold text-[#FAFAFA] mt-0.5">{plan.summary}</div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono font-semibold ${getRiskBadgeClass(plan.risk)}`}>
          {plan.risk} risk
        </span>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-[#A1A1AA] uppercase">Langkah Perubahan ({plan.steps.length}):</div>
        {plan.steps.map((step, idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-[#18181B] border border-white/10 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-blue-400 font-semibold">{step.operation}</span>
              <span className="text-[#A1A1AA] bg-[#111113] px-2 py-0.5 rounded border border-white/5">{step.target}</span>
            </div>

            {step.changes && Object.keys(step.changes).length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                {Object.entries(step.changes).map(([k, v]) => (
                  <div key={k} className="bg-[#111113] p-1.5 rounded border border-white/5">
                    <span className="text-[#71717A] block font-mono text-[10px]">{k}</span>
                    <span className="text-[#FAFAFA] font-medium truncate block">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
        <button
          onClick={handleCancelClick}
          disabled={isExecuting}
          className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-white/10 hover:bg-[#27272A] text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>Batal</span>
        </button>

        <button
          onClick={handleApprove}
          disabled={isExecuting}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Mengeksekusi...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Setujui & Eksekusi</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function ActionCard({ data }: ActionCardProps) {
  const title = data.title || data.data?.title;
  const message = data.message || data.data?.message;
  const items = data.items || data.data?.items || (Array.isArray(data.data) ? data.data : []);
  const key = data.key || data.data?.key;
  const assignee = data.assignee || data.data?.assignee;
  const rawData = data.data;

  const isUUID = (str?: string) => str ? /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(str) : false;

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'high': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'low': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-[#18181B] border-white/5 text-[#71717A]';
    }
  };

  const renderContent = () => {
    switch (data.type) {
      case 'issue_created':
        return (
          <div className="flex gap-3 items-start p-1">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#FAFAFA]">{title || 'Issue Created'}</div>
              <div className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-2">
                {key && <span className="font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{key}</span>}
                {assignee && <span>Assigned to {assignee}</span>}
              </div>
            </div>
          </div>
        );

      case 'batch_issues_created':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-green-400 border-b border-green-500/20 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>{title || 'Bulk Tasks Created'}</span>
              </div>
              <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-mono">
                {items.length} created
              </span>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {items.map((item: any, idx: number) => (
                <div 
                  key={item.id || idx} 
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181B] border border-green-500/20 hover:border-green-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <span className="text-[11px] font-mono font-semibold text-green-400 shrink-0 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                      {item.key}
                    </span>
                    <span className="text-xs text-[#FAFAFA] truncate font-medium">{item.title}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20 font-medium">
                    Created
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'issue_updated':
        return (
          <div className="flex gap-3 items-start p-1">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#FAFAFA]">{title || 'Issue Updated'}</div>
              <div className="text-xs text-[#A1A1AA] mt-1">{message}</div>
            </div>
          </div>
        );

      case 'issue_list':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#FAFAFA] border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-400" />
                <span>{title || 'Tasks List'}</span>
              </div>
              <span className="text-[10px] text-[#71717A] bg-[#18181B] border border-white/10 px-2 py-0.5 rounded-full font-mono">
                {items.length} tasks
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
              {items.map((item: any, idx: number) => (
                <div 
                  key={item.id || idx} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#18181B] border border-white/10 hover:border-white/20 transition-all gap-2"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                    <span className="text-[11px] font-mono font-semibold text-blue-400 shrink-0 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {item.key || 'TASK'}
                    </span>
                    <span className="text-xs text-[#FAFAFA] font-medium truncate" title={item.title}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.assignee && !isUUID(item.assignee) && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#111113] text-blue-400 border border-blue-500/20 font-medium">
                        {item.assignee}
                      </span>
                    )}
                    {item.priority && item.priority !== 'none' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono capitalize ${getPriorityBadgeClass(item.priority)}`}>
                        {item.priority}
                      </span>
                    )}
                    {item.state && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-medium">
                        {item.state}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <p className="text-xs text-[#71717A] text-center py-4">No tasks found for this request.</p>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex gap-3 items-start p-1">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-400">{title || 'Error'}</div>
              <div className="text-xs text-[#A1A1AA] mt-1">{message || (typeof rawData === 'string' ? rawData : JSON.stringify(rawData))}</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#FAFAFA]">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>{title || 'Details'}</span>
            </div>
            {message && <div className="text-xs text-[#A1A1AA]">{message}</div>}

            {rawData && typeof rawData === 'object' && !Array.isArray(rawData) && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-white/5 text-xs">
                {Object.entries(rawData).map(([k, v]) => {
                  if (k === 'id' || isUUID(String(v)) || typeof v === 'object' || !v) return null;
                  return (
                    <div key={k} className="bg-[#18181B] p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-[#71717A] uppercase font-mono block">{k.replace('_', ' ')}</span>
                      <span className="font-medium text-[#FAFAFA] capitalize">{String(v)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
    }
  };

  const getBorderColor = () => {
    switch (data.type) {
      case 'issue_created': return 'border-green-500/30 bg-green-500/5';
      case 'issue_updated': return 'border-blue-500/30 bg-blue-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-white/10 bg-[#111113]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3.5 rounded-xl border ${getBorderColor()} shadow-md my-2 w-full`}
    >
      {renderContent()}
    </motion.div>
  );
}
