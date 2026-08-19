'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import { TerminalSquare, LayoutGrid, ListTodo, Home, Menu } from 'lucide-react';

export function MobileNav() {
  const { activeView, setActiveView } = useWorkspaceStore();

  const navItems = [
    { id: 'day', label: 'My Day', icon: Home, action: () => setActiveView('day') },
    { id: 'board', label: 'Board', icon: LayoutGrid, action: () => setActiveView('board') },
    { id: 'command', label: 'AI', icon: TerminalSquare, action: () => setActiveView('command'), isPrimary: true },
    { id: 'issues', label: 'Issues', icon: ListTodo, action: () => setActiveView('issues') },
    { id: 'more', label: 'More', icon: Menu, action: () => {} },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#09090B]/90 backdrop-blur-md border-t border-white/5 pb-safe z-40">
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || (item.isPrimary && activeView === 'command');
          
          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="flex flex-col items-center justify-center w-14 h-14 -mt-6 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 border-4 border-[#09090B]"
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                isActive ? 'text-blue-500' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
