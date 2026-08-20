'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, User, Tag, ArrowUpRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { PlaneIssue } from '@/types/plane';

interface IssuePreviewDrawerProps {
  issueKey: string | null;
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
  onIssueUpdated?: () => void;
}

export function IssuePreviewDrawer({
  issueKey,
  projectId = 'ALL',
  isOpen,
  onClose,
  onIssueUpdated,
}: IssuePreviewDrawerProps) {
  const [issue, setIssue] = useState<PlaneIssue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && issueKey) {
      fetchIssueDetails(issueKey);
    } else {
      setIssue(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, issueKey]);

  const fetchIssueDetails = async (key: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plane?action=getIssue&projectId=${encodeURIComponent(projectId)}&issueId=${encodeURIComponent(key)}`);
      if (!res.ok) {
        throw new Error(`Failed to load issue ${key}`);
      }
      const data = await res.json();
      setIssue(data);
    } catch (err: any) {
      setError(err.message || 'Error loading issue details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newState: string) => {
    if (!issue || !issueKey) return;
    setIsUpdating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/plane?action=updateIssue&projectId=${encodeURIComponent(projectId)}&issueId=${encodeURIComponent(issueKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, issueId: issueKey, state: newState }),
      });
      if (!res.ok) throw new Error('Failed to update issue status.');
      const updated = await res.json();
      setIssue(prev => prev ? { ...prev, state: updated.state, state_detail: updated.state_detail } : null);
      setSuccessMsg(`Status updated to ${newState}`);
      onIssueUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (prio?: string) => {
    switch (prio?.toLowerCase()) {
      case 'urgent': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'medium': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-[#71717A] bg-white/[0.04] border-white/[0.08]';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-[#070A0E] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0B0F14]/80 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {issueKey}
                </span>
                <span className="text-xs font-mono text-[#71717A]">
                  TASK HUD PREVIEW
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#71717A] hover:text-[#FAFAFA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#71717A] font-mono text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>RETRIEVING TASK TELEMETRY...</span>
                </div>
              ) : error ? (
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              ) : issue ? (
                <>
                  {/* Title & Status Bar */}
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold text-[#FAFAFA] leading-snug">
                      {issue.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getPriorityColor(issue.priority)}`}>
                        {issue.priority || 'none'}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border text-cyan-300 bg-cyan-500/10 border-cyan-500/20">
                        {issue.state_detail?.name || 'Active'}
                      </span>
                      {issue.created_at && (
                        <span className="text-[10px] font-mono text-[#71717A] flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(issue.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {successMsg && (
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                      Description
                    </label>
                    <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] text-xs text-[#D4D4D8] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {issue.description_stripped || issue.description || 'No description provided for this task.'}
                    </div>
                  </div>

                  {/* Quick Action Matrix (0 Tokens) */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                      Quick Transition (0-Token Action)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus('Done')}
                        disabled={isUpdating}
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark as Done</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('In Progress')}
                        disabled={isUpdating}
                        className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Start Work</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0B0F14]/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#52525B]">
                PLANE SYNC READY
              </span>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] text-xs font-mono text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Close HUD
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
