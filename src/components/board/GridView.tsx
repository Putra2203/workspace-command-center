'use client';

import { motion } from 'motion/react';
import { Circle, User, Flag } from 'lucide-react';

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

interface GridViewProps {
  issues: BoardIssueItem[];
  states: PlaneState[];
  onSelectIssue: (id: string) => void;
}

export function GridView({ issues, states, onSelectIssue }: GridViewProps) {
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
        Tidak ada issue untuk ditampilkan dalam tampilan Grid.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 scrollbar-thin">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {issues.map((issue) => {
          const state = stateMap.get(issue.stateId);
          return (
            <motion.div
              key={issue.id}
              onClick={() => onSelectIssue(issue.id)}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="bg-[#111113] border border-white/10 hover:border-blue-500/40 p-4 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer shadow-xl transition-all group"
            >
              {/* Header: Key & Priority */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-blue-400">
                  {issue.key}
                </span>
                <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border capitalize shrink-0 ${getPriorityColor(issue.priority)}`}>
                  {issue.priority || 'none'}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xs font-semibold text-[#FAFAFA] group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                {issue.title}
              </h3>

              {/* Footer: State & Assignee */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-[#A1A1AA]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: state?.color || '#71717A' }}
                  />
                  <span className="truncate">{state?.name || 'No State'}</span>
                </div>

                <div
                  className="w-6 h-6 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[10px] font-medium text-[#FAFAFA] shrink-0"
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
  );
}
