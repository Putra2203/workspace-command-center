'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { AlertTriangle, LayoutGrid, List, Grid3X3, Search, X, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ListView } from '@/components/board/ListView';
import { GridView } from '@/components/board/GridView';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';

const WorkItemDetailPanel = dynamic(
  () => import('@/components/work-items/WorkItemDetailPanel').then(m => m.WorkItemDetailPanel),
  { ssr: false }
);

type ViewMode = 'kanban' | 'list' | 'grid';

export default function BoardPage() {
  const { currentUser, activeProjectId, activeProjectKey, setActiveProject } = useWorkspaceStore();
  const {
    issues,
    projects,
    displayIssues,
    states,
    memberMap,
    permissionError,
    fetchProjectData,
    handleMoveIssue,
    handleBulkUpdatePriority,
  } = useWorkspaceData();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStateId, setSelectedStateId] = useState('all');

  const selectedIssue = selectedIssueId ? issues.find(i => i.id === selectedIssueId) || null : null;

  if (permissionError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold text-[#FAFAFA] font-mono">Mission Access Restricted</h3>
        <p className="text-xs text-[#A1A1AA] max-w-sm mt-1 mb-4 font-mono">{permissionError}</p>
        <button
          onClick={() => {
            const fallback = projects.find(p => p.id !== activeProjectId);
            if (fallback) setActiveProject(fallback.id, fallback.identifier);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-medium transition-colors"
        >
          Switch to Active Mission
        </button>
      </div>
    );
  }

  const formattedIssues = useMemo(() => {
    return displayIssues.map(issue => {
      const stateId = typeof issue.state === 'string'
        ? issue.state
        : (issue.state as { id?: string } | undefined)?.id || issue.state_detail?.id || '';

      let assigneeName: string | undefined = undefined;

      // 1. Try issue.assignee_details
      if (Array.isArray((issue as any).assignee_details) && (issue as any).assignee_details.length > 0) {
        const detail = (issue as any).assignee_details[0];
        if (typeof detail === 'object' && detail !== null) {
          assigneeName = `${detail.first_name || ''} ${detail.last_name || ''}`.trim() || detail.display_name || detail.email;
        }
      }

      // 2. Try issue.assignees or issue.assignee_ids
      if (!assigneeName) {
        const rawAssignees = Array.isArray(issue.assignees) && issue.assignees.length > 0
          ? issue.assignees
          : (Array.isArray((issue as any).assignee_ids) ? (issue as any).assignee_ids : []);

        if (rawAssignees.length > 0) {
          const first = rawAssignees[0];
          if (typeof first === 'object' && first !== null) {
            assigneeName = `${first.first_name || ''} ${first.last_name || ''}`.trim() || first.display_name || first.email;
          } else if (typeof first === 'string') {
            assigneeName = memberMap.get(first);
          }
        }
      }

      return {
        id: issue.id,
        key: `${issue.project_detail?.identifier || activeProjectKey || '?'}-${issue.sequence_id}`,
        title: issue.name,
        priority: issue.priority || 'none',
        stateId,
        assignee: assigneeName,
      };
    });
  }, [displayIssues, activeProjectKey, memberMap]);

  const filteredIssues = useMemo(() => {
    return formattedIssues.filter(issue => {
      // 1. Search Query Filter (Title or Key)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = issue.title.toLowerCase().includes(q);
        const keyMatch = issue.key.toLowerCase().includes(q);
        if (!titleMatch && !keyMatch) return false;
      }

      // 2. Priority Filter
      if (selectedPriority !== 'all') {
        if ((issue.priority || 'none').toLowerCase() !== selectedPriority.toLowerCase()) {
          return false;
        }
      }

      // 3. State Filter
      if (selectedStateId !== 'all') {
        if (issue.stateId !== selectedStateId) return false;
      }

      return true;
    });
  }, [formattedIssues, searchQuery, selectedPriority, selectedStateId]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedPriority !== 'all' || selectedStateId !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPriority('all');
    setSelectedStateId('all');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#05070A]">
      {/* Top Layout Switcher Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#080B10] border-b border-white/[0.06] shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider hidden sm:inline">
            Board Layout:
          </span>
          <div className="flex items-center p-0.5 bg-[#0B0F14] border border-white/[0.08] rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
              title="List Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-[#71717A] hover:text-[#FAFAFA]'
              }`}
              title="Card Grid View"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-[#71717A] font-mono flex items-center gap-2">
          <span>
            <strong className="text-cyan-400">{filteredIssues.length}</strong> / {displayIssues.length} operations
          </span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2 bg-[#0B0F14] border-b border-white/[0.06] shrink-0">
        {/* Keyword Search Input */}
        <div className="relative flex items-center flex-1 min-w-[140px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operations key or title..."
            className="w-full bg-[#10151C] border border-white/[0.08] rounded-lg pl-8 pr-7 py-1 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none focus:border-cyan-400/50 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Priority Filter Select */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="bg-[#10151C] border border-white/[0.08] text-xs text-[#A1A1AA] rounded-lg px-2.5 py-1 outline-none font-mono capitalize cursor-pointer shrink-0"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">P0 - Urgent</option>
          <option value="high">P1 - High</option>
          <option value="medium">P2 - Medium</option>
          <option value="low">P3 - Low</option>
          <option value="none">P4 - None</option>
        </select>

        {/* State Filter Select */}
        <select
          value={selectedStateId}
          onChange={(e) => setSelectedStateId(e.target.value)}
          className="bg-[#10151C] border border-white/[0.08] text-xs text-[#A1A1AA] rounded-lg px-2.5 py-1 outline-none font-mono cursor-pointer shrink-0 max-w-[150px] truncate"
        >
          <option value="all">All States</option>
          {states.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Clear Active Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer ml-auto sm:ml-0"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'kanban' && (
          <KanbanBoard
            issues={filteredIssues}
            states={states}
            onMoveIssue={handleMoveIssue}
            onBulkUpdatePriority={handleBulkUpdatePriority}
            onSelectIssue={(id) => setSelectedIssueId(id)}
          />
        )}

        {viewMode === 'list' && (
          <ListView
            issues={filteredIssues}
            states={states}
            onSelectIssue={(id) => setSelectedIssueId(id)}
          />
        )}

        {viewMode === 'grid' && (
          <GridView
            issues={filteredIssues}
            states={states}
            onSelectIssue={(id) => setSelectedIssueId(id)}
          />
        )}
      </div>

      {/* Work Item Detail Sheet */}
      <AnimatePresence>
        {selectedIssue && (
          <WorkItemDetailPanel
            key={selectedIssue.id}
            issue={selectedIssue}
            allIssues={issues}
            states={states}
            memberMap={memberMap}
            activeProjectKey={activeProjectKey}
            currentUserId={currentUser?.id || null}
            onClose={() => setSelectedIssueId(null)}
            onOpenIssue={(id) => setSelectedIssueId(id)}
            onChanged={() => fetchProjectData(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
