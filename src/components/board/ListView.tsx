'use client';

import { motion } from 'motion/react';
import { Circle, User, Flag, ArrowUpDown } from 'lucide-react';

interface BoardIssueItem {
  id: string;
  key: string;
  title: string;
  priority: string;
  stateId: string;
  assignee?: string;
}

interface PlaneState {
  id: string;
  name: string;
  color: string;
  group: string;
}

interface ListViewProps {
  issues: BoardIssueItem[];
  states: PlaneState[];
  onSelectIssue: (id: string) => void;
}

export function ListView({ issues, states, onSelectIssue }: ListViewProps) {
  const stateMap = new Map(states.map(s => [s.id, s]));

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  if (issues.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-xs text-[#71717A]">
        Tidak ada issue untuk ditampilkan dalam tampilan List.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 scrollbar-thin">
      <div className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider bg-[#09090B]/50">
          <div className="col-span-3 sm:col-span-2 flex items-center gap-1 font-mono">
            <span>Key</span>
          </div>
          <div className="col-span-6 sm:col-span-5 flex items-center gap-1">
            <span>Title</span>
          </div>
          <div className="hidden sm:flex col-span-2 items-center gap-1">
            <span>State</span>
          </div>
          <div className="col-span-3 sm:col-span-2 flex items-center justify-end sm:justify-start gap-1">
            <span>Priority</span>
          </div>
          <div className="hidden md:flex col-span-1 justify-end">
            <span>Assignee</span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/5">
          {issues.map((issue) => {
            const state = stateMap.get(issue.stateId);
            return (
              <motion.div
                key={issue.id}
                onClick={() => onSelectIssue(issue.id)}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-xs text-[#FAFAFA] cursor-pointer transition-colors"
              >
                {/* Key */}
                <div className="col-span-3 sm:col-span-2 font-mono text-[11px] font-medium text-blue-400 truncate">
                  {issue.key}
                </div>

                {/* Title */}
                <div className="col-span-6 sm:col-span-5 font-medium truncate pr-2">
                  {issue.title}
                </div>

                {/* State Badge */}
                <div className="hidden sm:flex col-span-2 items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: state?.color || '#71717A' }}
                  />
                  <span className="truncate text-[11px] text-[#A1A1AA]">
                    {state?.name || 'No State'}
                  </span>
                </div>

                {/* Priority */}
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end sm:justify-start">
                  <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border capitalize shrink-0 ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'none'}
                  </span>
                </div>

                {/* Assignee */}
                <div className="hidden md:flex col-span-1 justify-end">
                  <div
                    className="w-6 h-6 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[10px] font-medium text-[#FAFAFA]"
                    title={issue.assignee || 'Unassigned'}
                  >
                    {issue.assignee ? issue.assignee.substring(0, 2).toUpperCase() : '?'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
