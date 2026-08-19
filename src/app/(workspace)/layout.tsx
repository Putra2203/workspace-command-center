'use client';

import { usePathname } from 'next/navigation';
import { Loader2, RefreshCw, User, Users } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
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
  const { activeProjectKey, userScope, setUserScope, toggleCommandPalette } = useWorkspaceStore();
  const { projects, projectsLoading, issues, fetchingIssues, fetchProjectData, refetchProjects } = useWorkspaceData();

  if (projectsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[#71717A] text-sm font-medium">Connecting to Plane Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar - Desktop only */}
      <Sidebar projects={projects} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#09090B] shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-[#FAFAFA]">{PAGE_TITLES[pathname] || ''}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
              {activeProjectKey || 'No Project'}
            </span>
          </div>

          {/* Center/Right Scope Switcher & Actions */}
          <div className="flex items-center gap-3">
            {/* Segmented Control for User Scope */}
            <div className="flex items-center p-0.5 bg-[#111113] border border-white/10 rounded-lg">
              <button
                onClick={() => setUserScope('my_tasks')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'my_tasks'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Tasks</span>
              </button>
              <button
                onClick={() => setUserScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  userScope === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Team</span>
              </button>
            </div>

            <button
              onClick={() => {
                refetchProjects();
                fetchProjectData(true);
              }}
              disabled={fetchingIssues}
              title="Refresh live project data"
              className="p-2 rounded-lg bg-[#111113] border border-white/10 hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingIssues ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={toggleCommandPalette}
              className="text-xs text-[#71717A] px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/10 hover:border-white/20 transition-colors font-mono hidden sm:block"
            >
              ⌘K
            </button>
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
