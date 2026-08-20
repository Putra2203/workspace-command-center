'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, User, Users, ChevronDown, Check, FolderKanban, Radio } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { WorkspaceDataProvider, useWorkspaceData } from '@/lib/context/workspace-data';

const PAGE_TITLES: Record<string, { title: string; shortTitle?: string; subtitle: string }> = {
  '/day': { title: 'Daily Mission', shortTitle: 'Daily', subtitle: 'Daily Operations & Focus Queue' },
  '/command': { title: 'AI Command Center', shortTitle: 'AI Console', subtitle: 'Gemini Intelligence Layer' },
  '/board': { title: 'Operations Board', shortTitle: 'Board', subtitle: 'Mission Kanban & Work Flow' },
  '/issues': { title: 'Work Items', shortTitle: 'Backlog', subtitle: 'Global Backlog & Tracking' },
  '/cycles': { title: 'Cycles & Sprints', shortTitle: 'Cycles', subtitle: 'Sprint Iterations' },
  '/telemetry': { title: 'AI Token Telemetry', shortTitle: 'Telemetry', subtitle: 'Gemini Quota & Consumption Observability' },
  '/analytics': { title: 'System Analytics', shortTitle: 'Analytics', subtitle: 'Health, Velocity & Observability' },
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
    { id: 'ALL', name: 'All Workspace Projects', identifier: 'ALL' },
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

  const pageMeta = PAGE_TITLES[pathname] || { title: 'Erdavid Work OS', shortTitle: 'Work OS', subtitle: 'Operations' };

  return (
    <div className="h-screen flex overflow-hidden relative bg-[#05070A] bg-technical-grid ambient-lighting">
      {/* Unified Framer Motion Splash & Loading Screen */}
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="unified-splash" />}
      </AnimatePresence>

      {/* Sidebar - Desktop only */}
      <Sidebar projects={projects} />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0 relative z-10">
        {/* Top Mission Control Header Bar (56px) */}
        <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-3 sm:px-5 bg-[#080B10]/95 backdrop-blur-md shrink-0 gap-2 relative z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            {/* Page Title */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-[#FAFAFA] tracking-tight truncate font-mono">
                <span className="hidden sm:inline">{pageMeta.title}</span>
                <span className="sm:hidden">{pageMeta.shortTitle || pageMeta.title}</span>
              </h1>
            </div>

            {/* Interactive Project Switcher Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-1 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-mono font-semibold transition-colors cursor-pointer"
                title="Switch active mission"
              >
                <span>{activeProjectKey || 'ALL'}</span>
                <ChevronDown className={`w-3 h-3 text-cyan-400 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#0B0F14] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-0.5">
                  <div className="px-2.5 py-1 text-[9px] font-semibold text-[#71717A] uppercase font-mono tracking-wider">
                    Missions ({allProjects.length})
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
                            ? 'bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/20'
                            : 'text-[#A1A1AA] hover:bg-[#10151C] hover:text-[#FAFAFA]'
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
              )}
            </div>
          </div>

          {/* Right Action Controls & Telemetry Badges */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Telemetry Status Indicators */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-[10px]">
              <StatusIndicator status="online" label="SYNC LIVE" />
              <StatusIndicator status="processing" label="AI ONLINE" />
            </div>

            {/* Segmented Scope Switcher */}
            <div className="flex items-center p-0.5 bg-[#0B0F14] border border-white/[0.08] rounded-lg">
              <button
                onClick={() => setUserScope('my_tasks')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                  userScope === 'my_tasks'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-[#71717A] hover:text-[#FAFAFA]'
                }`}
              >
                <User className="w-3 h-3" />
                <span className="hidden sm:inline">Assigned</span>
                <span className="sm:hidden">Mine</span>
              </button>
              <button
                onClick={() => setUserScope('all')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                  userScope === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-[#71717A] hover:text-[#FAFAFA]'
                }`}
              >
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">Workspace</span>
                <span className="sm:hidden">All</span>
              </button>
            </div>

            {/* Sync Refresh Button */}
            <button
              onClick={() => {
                refetchProjects();
                fetchProjectData(true);
              }}
              disabled={fetchingIssues}
              title="Synchronize live workspace telemetry"
              className="p-1.5 sm:p-2 rounded-lg bg-[#0B0F14] border border-white/[0.08] hover:bg-[#10151C] text-[#71717A] hover:text-[#FAFAFA] transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingIssues ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Command Palette Trigger */}
            <button
              onClick={toggleCommandPalette}
              className="text-xs text-[#71717A] hover:text-[#FAFAFA] px-2.5 py-1 rounded-lg bg-[#0B0F14] border border-white/[0.08] hover:border-white/[0.16] transition-colors font-mono hidden sm:block"
            >
              ⌘K
            </button>

            {/* Mobile Profile Avatar */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md md:hidden font-mono">
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
