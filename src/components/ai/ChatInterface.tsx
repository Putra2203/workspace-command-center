'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCard, ActionPlanCard } from './ActionCard';
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

export function ChatInterface({ onActionExecuted }: ChatInterfaceProps) {
  const { activeProjectId, activeProjectKey, pendingCommand, setPendingCommand } = useWorkspaceStore();
  const { issues } = useWorkspaceData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showContextMobile, setShowContextMobile] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  
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
        body: JSON.stringify({ projectId: activeProjectId }),
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

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !imageAttachment) || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      imageUrl: imageAttachment ? `data:${imageAttachment.mimeType};base64,${imageAttachment.base64}` : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const currentAttachment = imageAttachment;
    setImageAttachment(null);
    setIsLoading(true);

    try {
      // 1. Persist user message to DB in background
      if (sessionId) {
        fetch('/api/ai/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            role: 'user',
            content: trimmed || 'Attachment analyzed',
          }),
        }).then(() => loadSessions()).catch(() => {});
      }

      const targetProject = activeProjectKey === 'ALL' || !activeProjectKey ? 'PROJECT1' : activeProjectKey;
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed || 'Analisis screenshot ini dan buat task baru jika ditemukan isu.',
          projectId: targetProject,
          sessionId,
          image: currentAttachment ? { base64: currentAttachment.base64, mimeType: currentAttachment.mimeType } : undefined,
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

      // 2. Persist assistant message to DB in background
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

  const activeOperationsCount = issues.length;

  return (
    <div className="flex h-full overflow-hidden bg-[#05070A]">
      {/* Column 1: Left Mission Log History (Desktop 3-col layout) */}
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar on Mobile */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-[#080B10] border-b border-white/[0.06]">
          <button
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA] p-1.5 rounded-lg bg-[#0B0F14] border border-white/[0.08]"
          >
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>History</span>
          </button>

          <button
            onClick={createNewSession}
            className="p-1.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-mono flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            onClick={() => setShowContextMobile(!showContextMobile)}
            className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA] p-1.5 rounded-lg bg-[#0B0F14] border border-white/[0.08]"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Context</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-[#FAFAFA]">
                  AI Command & Intelligence System
                </h3>
                <p className="text-xs text-[#71717A] max-w-sm font-mono">
                  Ask AI to decompose features into sub-tasks, triage screenshots, or query project telemetry.
                </p>
              </div>

              {/* Quick Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-4">
                {[
                  'Break down Authentication into frontend and backend tasks',
                  'Find all overdue and blocked operations in this mission',
                  'Analyze active sprint workload and suggest priorities',
                  'Drop a screenshot for visual bug triage',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="p-2.5 rounded-lg bg-[#0B0F14] border border-white/[0.06] hover:border-violet-500/30 text-left text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors font-mono"
                  >
                    ✦ {prompt}
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
                  className={`max-w-[90%] sm:max-w-[80%] p-3.5 rounded-xl text-xs space-y-2.5 ${
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
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                  {m.plan && (
                    <ActionPlanCard
                      plan={m.plan}
                      onApprove={handleApprovePlan}
                      onCancel={() => {}}
                    />
                  )}

                  {m.actionCards?.map((card, i) => (
                    <ActionCard key={i} data={card} />
                  ))}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex flex-col items-start space-y-1">
              <span className="text-[9px] font-mono uppercase text-violet-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                AI PROCESSING CONTEXT...
              </span>
              <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-violet-500/20 text-xs font-mono text-[#A1A1AA] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
                <span>Decomposing project context and generating mission plan…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Console */}
        <div className="p-3 sm:p-4 bg-[#080B10] border-t border-white/[0.06]">
          {/* Image Attachment Preview */}
          {imageAttachment && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-[#0B0F14] border border-violet-500/30 rounded-lg w-fit">
              <span className="text-[11px] font-mono text-violet-300">
                📷 {imageAttachment.name}
              </span>
              <button
                onClick={() => setImageAttachment(null)}
                className="text-[#71717A] hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-[#0B0F14] border border-white/[0.08] focus-within:border-violet-500/40 rounded-xl p-2 transition-colors">
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
              className="p-2 rounded-lg text-[#71717A] hover:text-violet-400 hover:bg-violet-500/10 transition-colors shrink-0"
              title="Upload Screenshot (Vision Analysis)"
            >
              <ImagePlus className="w-4 h-4" />
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
              placeholder="Ask AI or type mission command... (Enter to send)"
              className="flex-1 bg-transparent border-none outline-none text-xs text-[#FAFAFA] placeholder-[#52525B] font-mono resize-none py-1.5 max-h-32"
            />

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !imageAttachment) || isLoading}
              className="p-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-40 transition-all shrink-0 shadow-md"
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
              <span className="text-[#A1A1AA]">Fast Route</span>
              <StatusIndicator status="online" label="READY" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1AA]">Deep Route</span>
              <StatusIndicator status="online" label="READY" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1AA]">Vision Triage</span>
              <StatusIndicator status="online" label="ACTIVE" />
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
              <span>Token Masking Active</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
