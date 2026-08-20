'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  TerminalSquare,
  LayoutGrid,
  ListTodo,
  Home,
  Menu,
  BarChart3,
  RefreshCw,
  Search,
  LogOut,
  X,
  User,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { TechnicalDivider } from '@/components/ui/TechnicalDivider';

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { currentUser, toggleCommandPalette } = useWorkspaceStore();

  const navItems = [
    { id: 'day', label: 'Mission', icon: Home, action: () => router.push('/day') },
    { id: 'board', label: 'Board', icon: LayoutGrid, action: () => router.push('/board') },
    { id: 'command', label: 'AI Command', icon: Sparkles, action: () => router.push('/command'), isPrimary: true },
    { id: 'issues', label: 'Items', icon: ListTodo, action: () => router.push('/issues') },
    {
      id: 'more',
      label: 'More',
      icon: Menu,
      action: () => setMoreOpen(true),
      isMore: true,
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const handleNavigate = (path: string) => {
    setMoreOpen(false);
    router.push(path);
  };

  const handleOpenSearch = () => {
    setMoreOpen(false);
    toggleCommandPalette();
  };

  const isMoreActive = pathname === '/analytics' || pathname === '/cycles';

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#05070A]/95 backdrop-blur-lg border-t border-white/[0.06] pb-safe z-40">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === `/${item.id}` ||
              (item.isPrimary && pathname === '/command') ||
              (item.isMore && isMoreActive);

            if (item.isPrimary) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  aria-label="AI Command Center"
                  className="flex flex-col items-center justify-center w-14 h-14 -mt-6 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.35)] border-4 border-[#05070A] active:scale-95 transition-transform"
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
                  isActive ? 'text-cyan-400 font-semibold' : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-mono tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile More Sheet / Drawer */}
      <AnimatePresence>
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setMoreOpen(false)}
            />

            {/* Bottom Drawer Card */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full bg-[#0B0F14] border-t border-white/[0.10] rounded-t-2xl shadow-2xl p-5 space-y-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-[#FAFAFA]">
                    Operations Menu
                  </span>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items Grid */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleNavigate('/analytics')}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    pathname === '/analytics'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-[#10151C] border-white/[0.06] text-[#FAFAFA] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold font-mono">System Telemetry</div>
                      <div className="text-[10px] text-[#71717A]">Health, Velocity, Observability</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#080B10] text-[#71717A] border border-white/[0.06] font-mono">
                    /analytics
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('/cycles')}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    pathname === '/cycles'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-[#10151C] border-white/[0.06] text-[#FAFAFA] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold font-mono">Iterations & Cycles</div>
                      <div className="text-[10px] text-[#71717A]">Active & Upcoming Iterations</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#080B10] text-[#71717A] border border-white/[0.06] font-mono">
                    /cycles
                  </span>
                </button>

                <button
                  onClick={handleOpenSearch}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#10151C] border border-white/[0.06] text-[#FAFAFA] hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold font-mono">Global Command</div>
                      <div className="text-[10px] text-[#71717A]">Quick search across all tasks</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#080B10] text-[#71717A] border border-white/[0.06] font-mono">
                    ⌘K
                  </span>
                </button>
              </div>

              {/* User Profile & Logout Section */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md font-mono">
                    {currentUser?.name
                      ? currentUser.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
                      : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#FAFAFA] truncate">
                      {currentUser?.name || 'Operator'}
                    </div>
                    <div className="text-[10px] text-[#71717A] truncate font-mono">
                      {currentUser?.email || 'Logged in'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-medium font-mono flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
