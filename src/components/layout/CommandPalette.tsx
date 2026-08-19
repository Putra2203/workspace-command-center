'use client';

import { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { motion, AnimatePresence } from 'motion/react';
import { Search, TerminalSquare, LayoutGrid, ListTodo, Plus, Search as SearchIcon } from 'lucide-react';

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'goto-cmd', label: 'Go to Command Center', icon: TerminalSquare, shortcut: 'G C', action: () => setActiveView('command') },
    { id: 'goto-board', label: 'Go to Board', icon: LayoutGrid, shortcut: 'G B', action: () => setActiveView('board') },
    { id: 'goto-issues', label: 'Go to Issues', icon: ListTodo, shortcut: 'G I', action: () => setActiveView('issues') },
    { id: 'new-issue', label: 'Create new issue', icon: Plus, shortcut: 'C I', action: () => { /* open new issue modal */ } },
    { id: 'search', label: 'Search projects and issues', icon: SearchIcon, shortcut: 'S', action: () => { /* focus search */ } },
  ];

  const filteredCommands = query 
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          setCommandPaletteOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCommandPaletteOpen(false)}
          className="fixed inset-0 bg-[#09090B]/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center px-4 py-3 border-b border-white/10">
            <Search className="w-5 h-5 text-[#71717A] mr-3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-[#FAFAFA] placeholder-[#71717A] outline-none text-base"
            />
            <div className="text-[10px] text-[#71717A] bg-[#18181B] px-1.5 py-0.5 rounded ml-2">ESC</div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#A1A1AA]">
                No commands found.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setCommandPaletteOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <div className="flex items-center gap-1">
                          {cmd.shortcut.split(' ').map((key, i) => (
                            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              isSelected ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-[#18181B] border-white/10 text-[#71717A]'
                            }`}>
                              {key}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
