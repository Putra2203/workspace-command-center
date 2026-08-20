'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, ImagePlus, X, History, Plus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCard, ActionPlanCard } from './ActionCard';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { ActionPlan } from '@/types/ai';

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
  const { activeProjectId, pendingCommand, setPendingCommand } = useWorkspaceStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollFrameRef = useRef<number>(0);

  // Throttled auto-scroll using requestAnimationFrame
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

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-create session on first load
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
      // Silently fail — sessions sidebar will just be empty
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
    setShowHistory(false);
    setMessages([]);

    if (session.id.startsWith('local-')) return;

    try {
      const res = await fetch(`/api/ai/sessions?sessionId=${session.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          actionCards: m.actionCards,
          plan: m.plan,
          imageUrl: m.imageUrl,
        })));
      }
    } catch {
      // Failed to load messages, keep empty
    }
  };

  const persistMessage = async (role: string, content: string, extras?: { actionCards?: any; plan?: any; imageUrl?: string }) => {
    if (!sessionId) return;
    try {
      await fetch('/api/ai/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role,
          content,
          ...extras,
        }),
      });
    } catch {
      // Silently fail — message is still in local state
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diizinkan (PNG, JPG, WEBP).');
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Ukuran gambar maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageAttachment({
        base64,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = () => {
    setImageAttachment(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageAttachment) || isLoading) return;
    
    const content = input.trim() || (imageAttachment ? `[Gambar: ${imageAttachment.name}]` : '');
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      imageUrl: imageAttachment ? `data:${imageAttachment.mimeType};base64,${imageAttachment.base64}` : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const currentImage = imageAttachment;
    setImageAttachment(null);

    // Persist user message
    persistMessage('user', content, { imageUrl: userMsg.imageUrl });

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          projectId: activeProjectId,
          userScope: useWorkspaceStore.getState().userScope,
          currentUser: useWorkspaceStore.getState().currentUser,
          ...(currentImage ? {
            image: {
              base64Data: currentImage.base64,
              mimeType: currentImage.mimeType,
            },
          } : {}),
        }),
      });
      const data = await res.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Request processed.',
        actionCards: data.actionCards,
        plan: data.plan,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Persist assistant message
      persistMessage('assistant', assistantMsg.content, {
        actionCards: assistantMsg.actionCards,
        plan: assistantMsg.plan,
      });

      if (data.actionCards && data.actionCards.length > 0 && onActionExecuted) {
        onActionExecuted();
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Terjadi kesalahan saat menghubungi AI Command Server.'
      };
      setMessages(prev => [...prev, errorMsg]);
      persistMessage('assistant', errorMsg.content);
    } finally {
      setIsLoading(false);
      // Refresh sessions list to update title
      loadSessions();
    }
  };

  const handleApprovePlan = async (plan: ActionPlan) => {
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      const execMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || 'Rencana tindakan telah dieksekusi.',
        actionCards: data.actionCards,
      };

      setMessages(prev => [...prev, execMsg]);
      persistMessage('assistant', execMsg.content, { actionCards: execMsg.actionCards });

      if (onActionExecuted) {
        onActionExecuted();
      }
    } catch (error) {
      console.error('Failed to execute plan:', error);
      const errCard: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Gagal mengeksekusi rencana tindakan.',
        actionCards: [{ type: 'error', title: 'Execution Error', message: 'Gagal menghubungi server eksekusi.' }],
      };
      setMessages(prev => [...prev, errCard]);
      persistMessage('assistant', errCard.content, { actionCards: errCard.actionCards });
    }
  };

  const handleCancelPlan = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, plan: null } : m));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedCommands = [
    "Tampilkan semua task",
    "Buat issue baru untuk fix login bug",
    "Pindahkan task PROJECT1-2 ke Done",
    "Tampilkan task overdue minggu ini"
  ];

  return (
    <div className="flex flex-col h-full bg-[#09090B] relative">
      {/* History Sidebar Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-[#111113] border-r border-white/10 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#FAFAFA]">Riwayat Chat</span>
                <button onClick={() => setShowHistory(false)} className="text-[#71717A] hover:text-[#FAFAFA] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={() => { createNewSession(); setShowHistory(false); }}
                  className="w-full px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Percakapan Baru
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-start gap-2 ${
                      sessionId === s.id
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : 'hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-[10px] text-[#71717A] mt-0.5">
                        {s._count?.messages || 0} pesan
                      </div>
                    </div>
                  </button>
                ))}
                {sessions.length === 0 && (
                  <p className="text-[10px] text-[#71717A] text-center py-6">Belum ada riwayat chat.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <button
          onClick={() => setShowHistory(true)}
          className="p-2 rounded-lg hover:bg-[#18181B] text-[#71717A] hover:text-[#FAFAFA] transition-colors"
          title="Riwayat Chat"
        >
          <History className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-[#71717A] font-mono truncate max-w-[200px]">
          {sessions.find(s => s.id === sessionId)?.title || 'New Conversation'}
        </span>
        <button
          onClick={createNewSession}
          className="p-2 rounded-lg hover:bg-[#18181B] text-[#71717A] hover:text-[#FAFAFA] transition-colors"
          title="Percakapan Baru"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Plane AI Command Workstation</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">Ketik perintah dalam Bahasa Indonesia atau Inggris untuk mengelola project Plane secara otomatis.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
              {suggestedCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setInput(cmd)}
                  className="px-3 py-2 rounded-xl bg-[#111113] border border-white/10 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] hover:border-white/20 transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-[#FAFAFA] rounded-br-sm' 
                      : 'bg-[#111113] border border-white/10 text-[#FAFAFA] rounded-bl-sm'
                  }`}>
                    {/* Image preview for user messages */}
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.imageUrl} alt="Attached" className="max-w-full max-h-48 object-contain" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    
                    {msg.plan && (
                      <ActionPlanCard
                        plan={msg.plan}
                        onApprove={handleApprovePlan}
                        onCancel={() => handleCancelPlan(msg.id)}
                      />
                    )}

                    {msg.actionCards && msg.actionCards.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {msg.actionCards.map((card, i) => (
                          <ActionCard key={i} data={card} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-[#111113] border border-white/10 rounded-2xl rounded-bl-sm p-4 flex items-center gap-2 text-xs text-[#A1A1AA]">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Analyzing intent & building plan...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-[#09090B] border-t border-white/5">
        {/* Image preview chip */}
        {imageAttachment && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="inline-flex items-center gap-2 bg-[#18181B] border border-white/10 rounded-xl px-3 py-1.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${imageAttachment.mimeType};base64,${imageAttachment.base64}`}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] text-[#A1A1AA] truncate max-w-[120px]">{imageAttachment.name}</span>
              <button onClick={removeImage} className="text-[#71717A] hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-[#111113] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          {/* Image attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 text-[#71717A] hover:text-blue-400 transition-colors shrink-0 mb-0.5 disabled:opacity-50"
            title="Lampirkan gambar"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah... (Enter to send)"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-[#FAFAFA] placeholder-[#71717A] p-3 scrollbar-thin text-xs leading-relaxed"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !imageAttachment) || isLoading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
