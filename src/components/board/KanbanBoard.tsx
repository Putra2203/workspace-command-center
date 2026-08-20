'use client';

import { useMemo, useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { Flag } from 'lucide-react';
import { IssueCard } from './IssueCard';
import { BulkActionPreview } from './BulkActionPreview';
import { buildBulkPriorityActionPlan } from '@/domain/work_items/bulk-actions';
import type { ActionPlan } from '@/types/ai';

export interface State {
  id: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  key: string;
  title: string;
  priority: string;
  stateId: string;
  assignee?: string;
}

interface KanbanBoardProps {
  states: State[];
  issues: Issue[];
  onMoveIssue: (issueId: string, newStateId: string) => void;
  /** Applies a confirmed bulk-priority ActionPlan; receives (issueId, newPriority) pairs */
  onBulkUpdatePriority?: (updates: { issueId: string; priority: string }[]) => Promise<void>;
  onSelectIssue?: (issueId: string) => void;
}

interface ColumnProps {
  state: State;
  issues: Issue[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectIssue?: (id: string) => void;
}

function Column({ state, issues, selectedIds, onToggleSelect, onSelectIssue }: ColumnProps) {
  const { setNodeRef } = useSortable({
    id: state.id,
    data: { type: 'Column', state }
  });

  return (
    <div className="flex flex-col w-[85vw] sm:w-72 shrink-0 snap-center h-full max-h-full overflow-hidden bg-[#05070A] border-r border-white/[0.06] last:border-r-0">
      {/* Column Header */}
      <div className="p-3 border-b border-white/[0.06] flex items-center gap-2 sticky top-0 bg-[#080B10] z-10">
        <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: state.color }} />
        <span className="font-mono text-xs font-semibold text-[#FAFAFA] uppercase tracking-wider">
          {state.name}
        </span>
        <span className="ml-auto text-[10px] font-mono font-bold bg-[#10151C] border border-white/[0.08] px-2 py-0.5 rounded-full text-cyan-400">
          {issues.length}
        </span>
      </div>

      {/* Column Droppable Area */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 scrollbar-thin space-y-2">
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {issues.length > 0 ? (
            issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                selected={selectedIds.has(issue.id)}
                onToggleSelect={onToggleSelect}
                onSelect={onSelectIssue}
              />
            ))
          ) : (
            <div className="h-24 rounded-lg border border-dashed border-white/[0.08] flex items-center justify-center text-[11px] font-mono text-[#52525B] bg-[#0B0F14]/40">
              DROP OPERATIONS HERE
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

const BULK_PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const;

export function KanbanBoard({ states, issues: initialIssues, onMoveIssue, onBulkUpdatePriority, onSelectIssue }: KanbanBoardProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);

  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingPlan, setPendingPlan] = useState<ActionPlan | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIssues = issues.filter(i => selectedIds.has(i.id));

  const requestBulkPriority = (priority: string) => {
    if (selectedIssues.length === 0) return;
    setPendingPlan(buildBulkPriorityActionPlan(selectedIssues, priority));
  };

  const issueLookup = useMemo(
    () => new Map(issues.map(i => [i.id, { key: i.key, title: i.title }])),
    [issues]
  );

  const confirmBulkPlan = async () => {
    if (!pendingPlan || !onBulkUpdatePriority) return;
    setIsApplying(true);
    try {
      await onBulkUpdatePriority(
        pendingPlan.steps.map(step => ({ issueId: step.target, priority: String(step.changes.priority) }))
      );
      setSelectedIds(new Set());
      setPendingPlan(null);
    } finally {
      setIsApplying(false);
    }
  };

  const columns = useMemo(() => {
    return states.map(state => ({
      ...state,
      issues: issues.filter(issue => issue.stateId === state.id)
    }));
  }, [states, issues]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Issue') {
      setActiveIssue(event.active.data.current.issue);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Issue';
    const isOverTask = over.data.current?.type === 'Issue';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Dropping issue over another issue
    if (isActiveTask && isOverTask) {
      setIssues(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);
        
        if (tasks[activeIndex].stateId !== tasks[overIndex].stateId) {
          tasks[activeIndex].stateId = tasks[overIndex].stateId;
        }
        
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping issue over empty column area
    if (isActiveTask && isOverColumn) {
      setIssues(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        tasks[activeIndex].stateId = overId as string;
        return arrayMove(tasks, activeIndex, activeIndex);
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const activeIssue = issues.find(i => i.id === active.id);
    if (activeIssue && activeIssue.stateId !== initialIssues.find(i => i.id === active.id)?.stateId) {
      onMoveIssue(activeIssue.id, activeIssue.stateId);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-x-auto bg-[#05070A] scrollbar-thin snap-x snap-mandatory pb-16 md:pb-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-px">
          {columns.map((col) => (
            <Column key={col.id} state={col} issues={col.issues} selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectIssue={onSelectIssue} />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <IssueCard issue={activeIssue} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Floating Bulk Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#0B0F14]/95 border border-cyan-500/30 shadow-[0_0_30px_rgba(56,189,248,0.15)] max-w-[95vw] overflow-x-auto z-40 backdrop-blur-md">
          <span className="text-xs font-mono font-semibold text-cyan-300 whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-[11px] font-mono text-[#71717A] flex items-center gap-1">
            <Flag className="w-3 h-3 text-cyan-400" /> Set:
          </span>
          {BULK_PRIORITIES.map(p => (
            <button
              key={p}
              onClick={() => requestBulkPriority(p)}
              className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-[#10151C] border border-white/[0.08] text-[#A1A1AA] hover:text-cyan-300 hover:border-cyan-400/40 transition-colors"
            >
              {p}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[11px] font-mono text-[#71717A] hover:text-[#FAFAFA] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {pendingPlan && (
        <BulkActionPreview
          plan={pendingPlan}
          issueLookup={issueLookup}
          onConfirm={confirmBulkPlan}
          onCancel={() => setPendingPlan(null)}
          isApplying={isApplying}
        />
      )}
    </div>
  );
}
