'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SendHorizontal,
  ImagePlus,
  X,
  History,
  Plus,
  MessageSquare,
  Sparkles,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Radio,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCard, ActionPlanCard } from './ActionCard';
import { IssuePreviewDrawer } from './IssuePreviewDrawer';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';
import { ActionPlan } from '@/types/ai';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TechnicalLabel } from '@/components/ui/TechnicalLabel';
import { TechnicalDivider } from '@/components/ui/TechnicalDivider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCards?: any[];
  plan?: ActionPlan | null;
  imageUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  _count?: { messages: number };
}

interface ChatInterfaceProps {
  onActionExecuted?: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const QUICK_CHIPS = [
  { label: '📋 Tugasku', cmd: '/today' },
  { label: '⚡ Overdue', cmd: '/overdue' },
  { label: '📊 Projects', cmd: 'daftar project' },
  { label: '❤️ Health', cmd: '/health' },
  { label: '🧩 Decompose', cmd: '/plan ' },
];

export function ChatInterface({ onActionExecuted }: ChatInterfaceProps) {
  const { activeProjectId, activeProjectKey, pendingCommand, setPendingCommand } = useWorkspaceStore();
  const { issues, fetchProjectData } = useWorkspaceData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showContextMobile, setShowContextMobile] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  
  // Slide-over Task HUD state
  const [previewIssueKey, setPreviewIssueKey] = useState<string | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollFrameRef = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (pendingCommand === null) return;
    setInput(pendingCommand);
    setPendingCommand(null);
    inputRef.current?.focus();
  }, [pendingCommand, setPendingCommand]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!sessionId) {
      createNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/ai/sessions');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {
      // ignore
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProjectId || 'ALL' }),
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setMessages([]);
        loadSessions();
      }
    } catch {
      setSessionId(`local-${Date.now()}`);
    }
  };

  const loadSession = async (session: ChatSession) => {
    setSessionId(session.id);
    setShowHistoryMobile(false);
    setMessages([]);

    if (session.id.startsWith('local-')) return;

    try {
      const res = await fetch(`/api/ai/sessions?sessionId=${session.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            actionCards: m.actionCards,
            plan: m.plan,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImageAttachment({
        base64,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenDrawer = (issueKey: string, projectId?: string) => {
    setPreviewIssueKey(issueKey);
    setPreviewProjectId(projectId || activeProjectId || 'ALL');
    setIsDrawerOpen(true);
  };

  const handleSend = async (customPrompt?: string) => {
    let rawInput = (customPrompt !== undefined ? customPrompt : input).trim();
    if ((!rawInput && !imageAttachment) || isLoading) return;

    // Handle Slash Commands deterministically
    let processedMessage = rawInput;
    if (rawInput.startsWith('/today')) {
      processedMessage = 'tampilkan tugasku';
    } else if (rawInput.startsWith('/overdue')) {
      processedMessage = 'tampilkan task overdue';
    } else if (rawInput.startsWith('/blockers')) {
      processedMessage = 'tampilkan task yang blocked';
    } else if (rawInput.startsWith('/health')) {
      processedMessage = 'ringkasan kesehatan dan progress project';
    } else if (rawInput.startsWith('/project ')) {
      const pName = rawInput.replace('/project ', '').trim();
      processedMessage = `tampilkan task di project ${pName}`;
    } else if (rawInput.startsWith('/plan ')) {
      const fName = rawInput.replace('/plan ', '').trim();
      processedMessage = `pecah feature ${fName} menjadi subtask`;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: rawInput,
      imageUrl: imageAttachment ? `data:${imageAttachment.mimeType};base64,${imageAttachment.base64}` : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const currentAttachment = imageAttachment;
    setImageAttachment(null);
    setIsLoading(true);

    try {
      if (sessionId) {
        fetch('/api/ai/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            role: 'user',
            content: rawInput || 'Attachment analyzed',
          }),
        }).then(() => loadSessions()).catch(() => {});
      }

      const targetProject = activeProjectKey || activeProjectId || 'ALL';
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: processedMessage || 'Analisis screenshot ini dan buat task baru jika ditemukan isu.',
          projectId: targetProject,
          sessionId,
          image: currentAttachment ? { base64Data: currentAttachment.base64, mimeType: currentAttachment.mimeType } : undefined,
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.analysis || data.message || data.content || 'Mission analysis complete.',
        plan: data.plan || null,
        actionCards: data.actionCards || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (sessionId) {
        fetch('/api/ai/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            role: 'assistant',
            content: assistantMessage.content,
            plan: assistantMessage.plan,
            actionCards: assistantMessage.actionCards,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'System Interruption: Unable to contact intelligence service. Please retry.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = async (plan: ActionPlan) => {
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, sessionId }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `exec-${Date.now()}`,
          role: 'assistant',
          content: 'Mission Plan successfully executed.',
          actionCards: [
            {
              type: 'batch_issues_created',
              message: `Executed ${plan.steps.length} operation steps cleanly.`,
              items: data.results || [],
            },
          ],
        },
      ]);

      if (onActionExecuted) onActionExecuted();
      fetchProjectData?.();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `exec-err-${Date.now()}`,
          role: 'assistant',
          content: 'Execution failed on one or more operations.',
        },
      ]);
    }
  };

  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(\b[A-Z0-9]+-\d+\b)/g);
    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (/^[A-Z0-9]+-\d+$/i.test(part)) {
            return (
              <button
                key={i}
                onClick={() => handleOpenDrawer(part.toUpperCase())}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold transition-colors cursor-pointer"
              >
                <span>{part.toUpperCase()}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            );
          }
          return part;
        })}
      </div>
    );
  };

  const activeOperationsCount = issues.length;

  return (
    <div className="flex h-full overflow-hidden bg-[#05070A] max-w-full">
      {/* Slide-Over Issue Preview Drawer */}
      <IssuePreviewDrawer
        isOpen={isDrawerOpen}
        issueKey={previewIssueKey}
        projectId={previewProjectId}
        onClose={() => setIsDrawerOpen(false)}
        onIssueUpdated={() => fetchProjectData?.()}
      />

      {/* Column 1: Left Mission Log History (Desktop) */}
      <aside className="w-64 border-r border-white/[0.06] bg-[#080B10] flex-col hidden lg:flex shrink-0">
        <div className="p-3.5 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            <TechnicalLabel>Mission Log History</TechnicalLabel>
          </div>
          <button
            onClick={createNewSession}
            className="p-1 rounded-md bg-[#10151C] border border-white/[0.08] hover:border-violet-500/40 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
            title="New Session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {sessions.map((s) => {
            const isCurrent = s.id === sessionId;
            return (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300 font-medium'
                    : 'text-[#71717A] hover:bg-[#0B0F14] hover:text-[#FAFAFA]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1 font-mono text-[11px]">
                  {s.title || 'Untitled Operation'}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Column 2: Center AI Command & Conversation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative max-w-full">
        {/* Mobile Compact Sub-Header */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-[#080B10]/90 backdrop-blur border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setShowHistoryMobile(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA] px-2.5 py-1.5 rounded-lg bg-[#0B0F14] border border-white/[0.08] active:scale-95 transition-transform"
          >
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>History ({sessions.length})</span>
          </button>

          <button
            onClick={createNewSession}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-300 border border-violet-500/30 text-xs font-mono flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setShowContextMobile(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA] px-2.5 py-1.5 rounded-lg bg-[#0B0F14] border border-white/[0.08] active:scale-95 transition-transform"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Context</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 scrollbar-thin overscroll-contain">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.15)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-[#FAFAFA]">
                  AI Command & Intelligence System
                </h3>
                <p className="text-xs text-[#71717A] max-w-sm font-mono leading-relaxed">
                  Autonomous copilot for Erdavid Work OS. List tasks, decompose epics, or triage issues.
                </p>
              </div>

              {/* Quick Starters & Slash Commands */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2 sm:pt-4">
                {[
                  { label: '📋 Tampilkan tugasku', cmd: '/today' },
                  { label: '⚡ List task di project aktif', cmd: 'list task ku' },
                  { label: '🧩 Pecah feature Authentication', cmd: '/plan Authentication Subtasks' },
                  { label: '📊 Tampilkan daftar project', cmd: 'daftar project' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.cmd)}
                    className="p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] hover:border-cyan-500/30 text-left text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors font-mono min-h-[44px] flex items-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[9px] font-mono uppercase text-[#71717A]">
                    {m.role === 'user' ? 'OPERATOR' : 'INTELLIGENCE SYSTEM'}
                  </span>
                </div>

                <div
                  className={`max-w-[95%] sm:max-w-[80%] p-3 sm:p-3.5 rounded-2xl text-xs space-y-2.5 ${
                    m.role === 'user'
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-[#FAFAFA] font-mono'
                      : 'bg-[#0B0F14] border border-white/[0.06] text-[#FAFAFA]'
                  }`}
                >
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="Operator Attachment"
                      className="rounded-lg max-h-48 border border-white/10 object-cover mb-2"
                    />
                  )}
                  
                  {renderContentWithMentions(m.content)}

                  {m.plan && (
                    <ActionPlanCard
                      plan={m.plan}
                      onApprove={handleApprovePlan}
                      onCancel={() => {}}
                    />
                  )}

                  {m.actionCards?.map((card, i) => (
                    <ActionCard
                      key={i}
                      data={card}
                      onOpenIssue={handleOpenDrawer}
                      onSelectOption={(opt) => handleSend(opt.value || opt.label)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex flex-col items-start space-y-1">
              <span className="text-[9px] font-mono uppercase text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI PROCESSING CONTEXT...
              </span>
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#0B0F14] border border-cyan-500/20 text-xs font-mono text-[#A1A1AA] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <span>Interpreting command and fetching live workspace state…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Console & Thumb Carousel */}
        <div className="p-2.5 sm:p-4 bg-[#080B10] border-t border-white/[0.06] shrink-0 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Horizontal Thumb Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => {
                  if (chip.cmd.endsWith(' ')) {
                    setInput(chip.cmd);
                    inputRef.current?.focus();
                  } else {
                    handleSend(chip.cmd);
                  }
                }}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[#0B0F14] hover:bg-[#10151C] border border-white/[0.08] hover:border-cyan-500/30 text-[11px] font-mono text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors flex items-center gap-1 active:scale-95"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Image Attachment Preview */}
          {imageAttachment && (
            <div className="flex items-center gap-2 p-2 bg-[#0B0F14] border border-violet-500/30 rounded-lg w-fit">
              <span className="text-[11px] font-mono text-violet-300">
                📷 {imageAttachment.name}
              </span>
              <button
                onClick={() => setImageAttachment(null)}
                className="text-[#71717A] hover:text-rose-400 p-1"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Textarea Input Bar (16px font on mobile prevents iOS Safari zoom) */}
          <div className="flex items-end gap-2 bg-[#0B0F14] border border-white/[0.08] focus-within:border-cyan-500/40 rounded-2xl p-1.5 sm:p-2 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-[#71717A] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Upload Screenshot (Vision Analysis)"
              aria-label="Upload Screenshot"
            >
              <ImagePlus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask AI or type /today, /overdue, /plan..."
              className="flex-1 bg-transparent border-none outline-none text-[16px] sm:text-xs text-[#FAFAFA] placeholder-[#52525B] font-mono resize-none py-2 px-1 max-h-32 leading-relaxed"
            />

            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !imageAttachment) || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 transition-all shrink-0 shadow-md min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
              aria-label="Send"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Column 3: Right Context Panel (Desktop) */}
      <aside className="w-72 border-l border-white/[0.06] bg-[#080B10] flex-col hidden xl:flex shrink-0 p-4 space-y-4 overflow-y-auto scrollbar-thin">
        <div>
          <TechnicalLabel>Mission Context</TechnicalLabel>
          <div className="mt-2 p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#71717A]">ACTIVE MISSION</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {activeProjectKey || 'ALL'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#71717A]">TOTAL WORK ITEMS</span>
              <span className="text-xs font-mono font-bold text-[#FAFAFA]">
                {activeOperationsCount}
              </span>
            </div>
          </div>
        </div>

        <div>
          <TechnicalLabel>Intelligence Engine</TechnicalLabel>
          <div className="mt-2 p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1AA]">L0 Deterministic</span>
              <StatusIndicator status="online" label="ACTIVE (0 Tokens)" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1AA]">L1 Flash-Lite</span>
              <StatusIndicator status="online" label="READY" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1AA]">L2/L3 Flash + Vision</span>
              <StatusIndicator status="online" label="READY" />
            </div>
          </div>
        </div>

        <div>
          <TechnicalLabel>Security & Protection</TechnicalLabel>
          <div className="mt-2 p-3 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2 text-[10px] font-mono text-[#71717A]">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PII Scrubber Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Free Tier Budget Guard (1,500 RPD)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Mission Log History Bottom Sheet */}
      <AnimatePresence>
        {showHistoryMobile && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowHistoryMobile(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full bg-[#080B10] border-t border-white/[0.10] rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[75vh] flex flex-col pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-1" />
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-mono font-bold uppercase text-[#FAFAFA]">
                    Mission History ({sessions.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowHistoryMobile(false)}
                  className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
                {sessions.map((s) => {
                  const isCurrent = s.id === sessionId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between min-h-[44px] ${
                        isCurrent
                          ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300 font-medium'
                          : 'bg-[#0B0F14] border border-white/[0.04] text-[#A1A1AA] hover:text-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <MessageSquare className="w-4 h-4 shrink-0 text-violet-400" />
                        <span className="truncate font-mono text-xs">
                          {s.title || 'Untitled Operation'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#52525B] shrink-0" />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  createNewSession();
                  setShowHistoryMobile(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 shadow-lg min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Mission Session</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Mission Context Bottom Sheet */}
      <AnimatePresence>
        {showContextMobile && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowContextMobile(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full bg-[#080B10] border-t border-white/[0.10] rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[75vh] flex flex-col pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-1" />
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase text-[#FAFAFA]">
                    Mission & AI Context
                  </span>
                </div>
                <button
                  onClick={() => setShowContextMobile(false)}
                  className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717A]">ACTIVE MISSION</span>
                    <span className="font-bold text-cyan-400">{activeProjectKey || 'ALL'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717A]">TOTAL WORK ITEMS</span>
                    <span className="font-bold text-[#FAFAFA]">{activeOperationsCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2.5">
                  <div className="text-[10px] font-mono uppercase text-[#71717A]">Intelligence Engine</div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#A1A1AA]">L0 Deterministic</span>
                    <StatusIndicator status="online" label="ACTIVE (0 Tokens)" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#A1A1AA]">L1 Flash-Lite</span>
                    <StatusIndicator status="online" label="READY" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#A1A1AA]">L2/L3 Flash + Vision</span>
                    <StatusIndicator status="online" label="READY" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/[0.06] space-y-2 text-[11px] font-mono text-[#71717A]">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>PII Scrubber Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Free Tier Budget Guard (1,500 RPD)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
