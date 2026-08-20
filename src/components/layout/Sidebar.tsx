'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sparkles,
  Sun,
  TerminalSquare,
  LayoutGrid,
  ListTodo,
  RefreshCw,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  FolderKanban,
  User,
  Users,
  LogOut,
  Radio,
  Cpu
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { motion, AnimatePresence } from 'motion/react';
import { TechnicalDivider } from '@/components/ui/TechnicalDivider';
import { LogoutOverlay } from '@/components/ui/LogoutOverlay';

interface Project {
  id: string;
  name: string;
  identifier: string;
}

interface SidebarProps {
  projects: Project[];
}

export function Sidebar({ projects }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const {
    sidebarOpen,
    setSidebarOpen,
    activeProjectId,
    setActiveProject,
    userScope,
    setUserScope,
    currentUser
  } = useWorkspaceStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allProjects = [
    { id: 'ALL', name: 'All Workspace Projects', identifier: 'ALL' },
    ...projects,
  ];

  const activeProject = allProjects.find(p => p.id === activeProjectId || p.identifier === activeProjectId) || allProjects[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const operationNavItems = [
    { id: 'day', label: 'Daily Mission', icon: Sun },
    { id: 'board', label: 'Operations Board', icon: LayoutGrid },
    { id: 'issues', label: 'Work Items', icon: ListTodo },
    { id: 'cycles', label: 'Iterations & Cycles', icon: RefreshCw },
  ] as const;

  const systemNavItems: { id: string; label: string; icon: any; isAI?: boolean }[] = [
    { id: 'command', label: 'AI Command Center', icon: TerminalSquare, isAI: true },
    { id: 'telemetry', label: 'AI Token Telemetry', icon: Cpu, isAI: true },
    { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 256 : 76 }}
      className="h-screen bg-[#05070A] border-r border-white/[0.06] flex flex-col hidden md:flex relative shrink-0 transition-all duration-300 z-30"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between gap-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
            <Radio className="w-4 h-4" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-[#FAFAFA] tracking-wider uppercase font-mono">
                Erdavid Work OS
              </span>
              <span className="text-[10px] text-cyan-400/80 font-mono tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                MISSION CONTROL
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mission / Project Selector Dropdown */}
      <div className="px-3 py-2.5 relative" ref={dropdownRef}>
        {sidebarOpen && (
          <div className="text-[9px] uppercase font-mono font-medium text-[#71717A] tracking-[0.16em] mb-1 px-1">
            Active Mission
          </div>
        )}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0B0F14] hover:bg-[#10151C] transition-colors border border-white/[0.08] text-left group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 flex items-center justify-center text-[10px] font-bold font-mono">
              {activeProject?.identifier?.substring(0, 3) || 'ALL'}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-xs font-medium text-[#FAFAFA] truncate group-hover:text-cyan-300 transition-colors">
                  {activeProject?.name || 'All Missions'}
                </span>
                <span className="text-[10px] text-[#71717A] font-mono">
                  {activeProject?.identifier === 'ALL' ? 'GLOBAL SCOPE' : activeProject?.identifier}
                </span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <ChevronDown className={`w-3.5 h-3.5 text-[#71717A] shrink-0 transition-transform ${dropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          )}
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-3 right-3 top-full mt-1 bg-[#0B0F14] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto scrollbar-thin"
            >
              <div className="p-1.5 space-y-0.5">
                <div className="px-2 py-1 text-[9px] font-semibold text-[#71717A] uppercase font-mono tracking-wider">
                  Missions ({allProjects.length})
                </div>
                {allProjects.map((proj) => {
                  const isSelected = proj.id === activeProject?.id || (activeProject?.identifier === proj.identifier);
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj.id, proj.identifier);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        isSelected 
                          ? 'bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/20' 
                          : 'text-[#A1A1AA] hover:bg-[#10151C] hover:text-[#FAFAFA] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <FolderKanban className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto scrollbar-thin">
        {/* Section 1: OPERATIONS */}
        <div>
          {sidebarOpen && <TechnicalDivider label="Operations" className="my-1.5" />}
          <div className="space-y-0.5">
            {operationNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === `/${item.id}`;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/${item.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all group ${
                    isActive 
                      ? 'bg-cyan-500/[0.08] text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(56,189,248,0.05)]' 
                      : 'text-[#A1A1AA] hover:bg-[#0B0F14] hover:text-[#FAFAFA] border-l-2 border-transparent'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-[#71717A] group-hover:text-[#FAFAFA]'}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: SYSTEM & AI */}
        <div>
          {sidebarOpen && <TechnicalDivider label="Intelligence" className="my-1.5" />}
          <div className="space-y-0.5">
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === `/${item.id}`;
              const isAI = item.isAI;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/${item.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all group ${
                    isActive
                      ? isAI
                        ? 'bg-violet-500/[0.12] text-violet-300 font-semibold border-l-2 border-violet-400 shadow-[inset_0_0_15px_rgba(139,92,246,0.08)]'
                        : 'bg-cyan-500/[0.08] text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-[inset_0_0_12px_rgba(56,189,248,0.05)]'
                      : 'text-[#A1A1AA] hover:bg-[#0B0F14] hover:text-[#FAFAFA] border-l-2 border-transparent'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive 
                      ? isAI ? 'text-violet-400' : 'text-cyan-400'
                      : isAI ? 'text-violet-400/70 group-hover:text-violet-400' : 'text-[#71717A] group-hover:text-[#FAFAFA]'
                  }`} />
                  {sidebarOpen && (
                    <div className="flex items-center justify-between w-full">
                      <span>{item.label}</span>
                      {isAI && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          AI
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Scope Quick Switch */}
      {sidebarOpen && (
        <div className="px-3 py-2 border-t border-white/[0.04]">
          <div className="text-[9px] uppercase font-mono font-medium text-[#71717A] tracking-[0.16em] mb-1.5 px-1">
            Operation Scope
          </div>
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0B0F14] border border-white/[0.06] rounded-lg">
            <button
              onClick={() => setUserScope('my_tasks')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[10px] font-mono font-medium transition-all ${
                userScope === 'my_tasks'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Assigned</span>
            </button>
            <button
              onClick={() => setUserScope('all')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[10px] font-mono font-medium transition-all ${
                userScope === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Live System Status Telemetry Banner */}
      <div className="px-3 py-2 border-t border-white/[0.04] bg-[#080B10]">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {sidebarOpen ? 'SYSTEM OPERATIONAL' : 'OK'}
          </span>
          {sidebarOpen && <span className="text-[#52525B]">v1.0</span>}
        </div>
      </div>

      {/* User Profile & Collapse Toggle */}
      <div className="p-3 border-t border-white/[0.06] bg-[#05070A] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
            {currentUser?.name
              ? currentUser.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
              : 'U'}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-xs font-semibold text-[#FAFAFA] truncate">
                {currentUser?.name || 'Operator'}
              </span>
              <span className="text-[10px] text-[#71717A] truncate font-mono">
                {currentUser?.email || ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={async () => {
              setIsLoggingOut(true);
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch (err) {
                console.error('Logout failed:', err);
              }
              setTimeout(() => {
                router.push('/login');
                router.refresh();
              }, 1000);
            }}
            title="Keluar / Logout"
            className="p-1.5 rounded-lg text-[#71717A] hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#10151C] hover:text-[#FAFAFA] transition-colors cursor-pointer"
          >
            {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Fullscreen Animated Logout Sequence */}
      <LogoutOverlay isVisible={isLoggingOut} />
    </motion.aside>
  );
}
