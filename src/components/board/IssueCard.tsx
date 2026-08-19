'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Issue {
  id: string;
  key: string;
  title: string;
  priority: string;
  stateId: string;
  assignee?: string;
}

interface IssueCardProps {
  issue: Issue;
  onSelect?: (id: string) => void;
}

export function IssueCard({ issue, onSelect }: IssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { type: 'Issue', issue } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-[#71717A]';
    }
  };

  const isUUID = (str?: string) => str ? /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(str) : false;

  const assigneeInitials = issue.assignee && !isUUID(issue.assignee)
    ? issue.assignee.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(issue.id)}
      className={`p-3 bg-[#111113] border border-white/5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#18181B] hover:border-white/10 transition-colors shadow-sm group ${
        isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="text-[10px] font-medium text-[#71717A] mb-1">{issue.key}</div>
      <div className="text-sm text-[#FAFAFA] line-clamp-2 leading-snug mb-3">{issue.title}</div>
      <div className="flex items-center justify-between mt-auto">
        <div className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)}`} title={`Priority: ${issue.priority}`} />
        <div className="w-5 h-5 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[9px] font-medium text-[#FAFAFA]" title={issue.assignee || 'Unassigned'}>
          {assigneeInitials}
        </div>
      </div>
    </div>
  );
}
