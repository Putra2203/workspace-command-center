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
  LogOut
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { motion, AnimatePresence } from 'motion/react';

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
    { id: 'ALL', name: 'All Projects', identifier: 'ALL' },
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

  const navItems = [
    { id: 'day', label: 'My Day', icon: Sun },
    { id: 'command', label: 'Command Center', icon: TerminalSquare },
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'issues', label: 'Issues', icon: ListTodo },
    { id: 'cycles', label: 'Cycles', icon: RefreshCw },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 250 : 80 }}
      className="h-screen bg-[#09090B] border-r border-white/5 flex flex-col hidden md:flex relative shrink-0 transition-all duration-300 z-30"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-[#FAFAFA] tracking-tight">Plane AI</span>
            <span className="text-[10px] text-[#71717A]">Command Center</span>
          </div>
        )}
      </div>

      {/* Project Selector Dropdown */}
      <div className="px-3 py-2 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#111113] hover:bg-[#18181B] transition-colors border border-white/10 text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 flex items-center justify-center text-xs font-bold font-mono">
              {activeProject?.identifier?.substring(0, 2) || 'P'}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-medium text-[#FAFAFA] truncate">
                  {activeProject?.name || 'Select Project'}
                </span>
                <span className="text-[10px] text-[#71717A] font-mono">
                  {activeProject?.identifier || ''}
                </span>
              </div>
            )}
          </div>
          {sidebarOpen && <ChevronDown className={`w-4 h-4 text-[#71717A] shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />}
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-3 right-3 top-full mt-1 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto scrollbar-thin"
            >
              <div className="p-1.5 space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
                  Projects ({allProjects.length})
                </div>
                {allProjects.map((proj) => {
                  const isSelected = proj.id === activeProject?.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj.id, proj.identifier);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected 
                          ? 'bg-blue-500/10 text-blue-400 font-medium' 
                          : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FolderKanban className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === `/${item.id}`;
          return (
            <button
              key={item.id}
              onClick={() => router.push(`/${item.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium' 
                  : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA] border border-transparent'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="text-xs">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Scope Quick Switch in Sidebar */}
      {sidebarOpen && (
        <div className="px-3 py-2 border-t border-white/5">
          <div className="text-[10px] uppercase font-mono font-semibold text-[#71717A] mb-1.5 px-1">
            Task Filter Scope
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#111113] border border-white/10 rounded-lg">
            <button
              onClick={() => setUserScope('my_tasks')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                userScope === 'my_tasks'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Mine</span>
            </button>
            <button
              onClick={() => setUserScope('all')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                userScope === 'all'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>All</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Card & Collapse Toggle */}
      <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
            {currentUser?.name
              ? currentUser.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
              : '…'}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-[#FAFAFA] truncate">
                {currentUser?.name || 'Loading…'}
              </span>
              <span className="text-[10px] text-[#71717A] truncate">
                {currentUser?.email || ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
              router.refresh();
            }}
            title="Keluar / Logout"
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA] transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
