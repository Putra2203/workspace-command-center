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
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { currentUser, toggleCommandPalette } = useWorkspaceStore();

  const navItems = [
    { id: 'day', label: 'My Day', icon: Home, action: () => router.push('/day') },
    { id: 'board', label: 'Board', icon: LayoutGrid, action: () => router.push('/board') },
    { id: 'command', label: 'AI', icon: TerminalSquare, action: () => router.push('/command'), isPrimary: true },
    { id: 'issues', label: 'Issues', icon: ListTodo, action: () => router.push('/issues') },
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#09090B]/90 backdrop-blur-md border-t border-white/5 pb-safe z-40">
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
                  className="flex flex-col items-center justify-center w-14 h-14 -mt-6 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 border-4 border-[#09090B] active:scale-95 transition-transform"
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
                  isActive ? 'text-blue-500 font-semibold' : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
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
              className="relative w-full bg-[#111113] border-t border-white/10 rounded-t-2xl shadow-2xl p-5 space-y-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-[#FAFAFA]">Menu & Navigasi</span>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA] transition-colors"
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
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-[#18181B] border-white/5 text-[#FAFAFA] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold">Analytics & Metrics</div>
                      <div className="text-[10px] text-[#71717A]">Project Health, Velocity, Burndown</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#111113] text-[#71717A] border border-white/5 font-mono">
                    /analytics
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate('/cycles')}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    pathname === '/cycles'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-[#18181B] border-white/5 text-[#FAFAFA] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold">Cycles & Sprints</div>
                      <div className="text-[10px] text-[#71717A]">Active, Upcoming & Iterations</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#111113] text-[#71717A] border border-white/5 font-mono">
                    /cycles
                  </span>
                </button>

                <button
                  onClick={handleOpenSearch}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-white/5 text-[#FAFAFA] hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold">Pencarian Cepat</div>
                      <div className="text-[10px] text-[#71717A]">Buka Command Palette (Cari Issue)</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#111113] text-[#71717A] border border-white/5 font-mono">
                    ⌘K
                  </span>
                </button>
              </div>

              {/* User Profile & Logout Section */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                    {currentUser?.name
                      ? currentUser.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
                      : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#FAFAFA] truncate">
                      {currentUser?.name || 'Plane User'}
                    </div>
                    <div className="text-[10px] text-[#71717A] truncate">
                      {currentUser?.email || 'Logged in'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
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
