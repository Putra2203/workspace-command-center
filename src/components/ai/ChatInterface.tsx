'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCard } from './ActionCard';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCards?: any[];
}

interface ChatInterfaceProps {
  onActionExecuted?: () => void;
}

export function ChatInterface({ onActionExecuted }: ChatInterfaceProps) {
  const { activeProjectId } = useWorkspaceStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          projectId: activeProjectId,
          userScope: useWorkspaceStore.getState().userScope,
          currentUser: useWorkspaceStore.getState().currentUser,
        }),
      });
      const data = await res.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Request processed.',
        actionCards: data.actionCards
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Notify parent to refresh board/issues if action executed
      if (data.actionCards && data.actionCards.length > 0 && onActionExecuted) {
        onActionExecuted();
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'There was an error connecting to the AI Command Server.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col h-full bg-[#09090B]">
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
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    
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
                    <span>Processing command...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="p-4 bg-[#09090B] border-t border-white/5">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-[#111113] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah... (Enter to send)"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-[#FAFAFA] placeholder-[#71717A] p-3 scrollbar-thin text-xs leading-relaxed"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
