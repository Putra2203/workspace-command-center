'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, RefreshCw, User, Users, ChevronDown, Check, FolderKanban } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { WorkspaceDataProvider, useWorkspaceData } from '@/lib/context/workspace-data';

const PAGE_TITLES: Record<string, string> = {
  '/day': 'My Day',
  '/command': 'AI Command Center',
  '/board': 'Kanban Board',
  '/issues': 'Issue Backlog',
  '/cycles': 'Cycles',
  '/analytics': 'Analytics',
};

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeProjectId, activeProjectKey, setActiveProject, userScope, setUserScope, currentUser, toggleCommandPalette } = useWorkspaceStore();
  const { projects, projectsLoading, issues, fetchingIssues, fetchProjectData, refetchProjects } = useWorkspaceData();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Guarantee minimum splash time for smooth initial entrance
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Latch initial load completion so background fetches never re-trigger the splash overlay
  useEffect(() => {
    if (!projectsLoading && !fetchingIssues && minTimeElapsed) {
      setHasInitialLoaded(true);
    }
  }, [projectsLoading, fetchingIssues, minTimeElapsed]);

  const showSplash = !hasInitialLoaded && (projectsLoading || fetchingIssues || !minTimeElapsed);

  const allProjects = useMemo(() => [
    { id: 'ALL', name: 'All Projects', identifier: 'ALL' },
    ...projects,
  ], [projects]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Unified Framer Motion Splash & Loading Screen */}
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="unified-splash" />}
      </AnimatePresence>

      {/* Sidebar - Desktop only */}
      <Sidebar projects={projects} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-3 sm:px-4 bg-[#09090B] shrink-0 gap-2 relative z-30">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
            <h1 className="text-xs sm:text-sm font-semibold text-[#FAFAFA] whitespace-nowrap truncate max-w-[110px] sm:max-w-none">
              {PAGE_TITLES[pathname] || ''}
            </h1>

            {/* Interactive Project Switcher Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-mono font-semibold transition-colors cursor-pointer"
                title="Switch active project"
              >
                <span>{activeProjectKey || 'ALL'}</span>
                <ChevronDown className={`w-3 h-3 text-blue-400 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Projects ({allProjects.length})
                  </div>
                  {allProjects.map((proj) => {
                    const isSelected = proj.id === activeProjectId || (activeProjectId === 'ALL' && proj.id === 'ALL');
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setActiveProject(proj.id, proj.identifier);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-500/10 text-blue-400 font-medium'
                            : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA]'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <FolderKanban className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
                          <span className="truncate">{proj.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Center/Right Scope Switcher & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Segmented Control for User Scope */}
            <div className="flex items-center p-0.5 bg-[#111113] border border-white/10 rounded-lg">
              <button
                onClick={() => setUserScope('my_tasks')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'my_tasks'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Tasks</span>
                <span className="sm:hidden">Mine</span>
              </button>
              <button
                onClick={() => setUserScope('all')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All Team</span>
                <span className="sm:hidden">All</span>
              </button>
            </div>

            <button
              onClick={() => {
                refetchProjects();
                fetchProjectData(true);
              }}
              disabled={fetchingIssues}
              title="Refresh live project data"
              className="p-1.5 sm:p-2 rounded-lg bg-[#111113] border border-white/10 hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${fetchingIssues ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={toggleCommandPalette}
              className="text-xs text-[#71717A] px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/10 hover:border-white/20 transition-colors font-mono hidden sm:block"
            >
              ⌘K
            </button>

            {/* Mobile Profile Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md md:hidden">
              {currentUser?.name
                ? currentUser.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
                : 'U'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">{children}</div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Command Palette */}
      <CommandPalette issues={issues} activeProjectKey={activeProjectKey} />
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceDataProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceDataProvider>
  );
}
