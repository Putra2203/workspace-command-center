'use client';

import { useMemo, useState } from 'react';
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
import { CSS } from '@dnd-kit/utilities';
import { IssueCard } from './IssueCard';

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
}

interface ColumnProps {
  state: State;
  issues: Issue[];
}

function Column({ state, issues }: ColumnProps) {
  const { setNodeRef } = useSortable({
    id: state.id,
    data: { type: 'Column', state }
  });

  return (
    <div className="flex flex-col w-72 shrink-0 h-full max-h-full overflow-hidden bg-[#09090B] border-r border-white/5 last:border-r-0">
      <div className="p-3 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#09090B] z-10">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: state.color }} />
        <span className="font-medium text-sm text-[#FAFAFA]">{state.name}</span>
        <span className="ml-auto text-xs bg-[#111113] border border-white/10 px-2 py-0.5 rounded-full text-[#A1A1AA]">
          {issues.length}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 scrollbar-thin space-y-2">
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {issues.length > 0 ? (
            issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))
          ) : (
            <div className="h-24 rounded-lg border-2 border-dashed border-white/5 flex items-center justify-center text-xs text-[#71717A]">
              Drop issues here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ states, issues: initialIssues, onMoveIssue }: KanbanBoardProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

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
        return arrayMove(tasks, activeIndex, activeIndex); // trigger re-render
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
    <div className="flex h-full w-full overflow-x-auto bg-[#09090B] scrollbar-thin">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-px">
          {columns.map((col) => (
            <Column key={col.id} state={col} issues={col.issues} />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <IssueCard issue={activeIssue} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
