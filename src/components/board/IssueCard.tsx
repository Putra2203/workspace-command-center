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
  /** Multi-select for bulk actions (e.g. bulk priority change) — separate from onSelect's single-issue click */
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const PRIORITY_BADGES: Record<string, { label: string; class: string }> = {
  urgent: { label: 'P0', class: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  high: { label: 'P1', class: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  medium: { label: 'P2', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  low: { label: 'P3', class: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  none: { label: 'P4', class: 'text-[#71717A] bg-zinc-800/40 border-white/[0.06]' },
};

export function IssueCard({ issue, onSelect, selected = false, onToggleSelect }: IssueCardProps) {
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

  const isUUID = (str?: string) => (str ? /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(str) : false);

  const assigneeInitials =
    issue.assignee && !isUUID(issue.assignee)
      ? issue.assignee
          .split(' ')
          .map((n) => n[0])
          .filter(Boolean)
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : '?';

  const priority = (issue.priority || 'none').toLowerCase();
  const badge = PRIORITY_BADGES[priority] || PRIORITY_BADGES.none;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(issue.id)}
      className={`relative p-3 bg-[#0B0F14] border rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#10151C] transition-all shadow-sm group ${
        selected
          ? 'border-cyan-400 ring-1 ring-cyan-400/30'
          : 'border-white/[0.06] hover:border-cyan-400/30'
      } ${isDragging ? 'opacity-70 scale-[1.02] border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]' : ''}`}
    >
      {onToggleSelect && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(issue.id);
          }}
          className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            selected
              ? 'bg-cyan-500 border-cyan-500 text-[#05070A]'
              : 'border-white/20 bg-[#05070A]/80 opacity-0 group-hover:opacity-100'
          }`}
          aria-label={selected ? 'Deselect issue' : 'Select issue'}
        >
          {selected && <span className="w-1.5 h-1.5 rounded-xs bg-[#05070A]" />}
        </button>
      )}

      {/* Card Header: Monospace Key & Priority Code */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-medium text-cyan-400 tracking-tight">
          {issue.key}
        </span>
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badge.class}`}>
          {badge.label}
        </span>
      </div>

      {/* Task Title */}
      <div className="text-xs font-medium text-[#FAFAFA] line-clamp-2 leading-snug mb-3 group-hover:text-cyan-300 transition-colors">
        {issue.title}
      </div>

      {/* Card Footer: Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-auto">
        <span className="text-[9px] font-mono text-[#52525B] uppercase tracking-wider">
          {issue.assignee && !isUUID(issue.assignee) ? issue.assignee.split(' ')[0] : 'UNASSIGNED'}
        </span>
        <div
          className="w-5 h-5 rounded bg-[#151B23] border border-white/[0.08] flex items-center justify-center text-[9px] font-mono font-bold text-[#FAFAFA]"
          title={issue.assignee || 'Unassigned'}
        >
          {assigneeInitials}
        </div>
      </div>
    </div>
  );
}
