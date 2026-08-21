'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, SlidersHorizontal, X } from 'lucide-react';
import type { Project } from '@/lib/context/workspace-data';

interface QuickTaskCaptureProps {
  activeProjectKey: string | null;
  projects: Project[];
  onTaskCreated: () => void;
}

interface OptionState {
  id: string;
  name: string;
}

interface OptionMember {
  id: string;
  name: string;
}

interface RawState {
  id: string;
  name: string;
}

interface RawMember {
  id?: string;
  email?: string;
  member?: { id?: string; first_name?: string; last_name?: string; email?: string };
}

export function QuickTaskCapture({ activeProjectKey, projects, onTaskCreated }: QuickTaskCaptureProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // The default project is derived from the globally active project (falling back to the
  // first workspace project when the active scope is "ALL"); `projectIdOverride` only gets
  // set once the operator actually picks something different from the dropdown.
  const defaultProjectId = useMemo(() => {
    if (projects.length === 0) return '';
    const matched = activeProjectKey && activeProjectKey !== 'ALL'
      ? projects.find((p) => p.id === activeProjectKey || p.identifier === activeProjectKey)
      : undefined;
    return matched?.id || projects[0].id;
  }, [activeProjectKey, projects]);
  const [projectIdOverride, setProjectIdOverride] = useState('');
  const projectId = projectIdOverride || defaultProjectId;

  const [stateId, setStateId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [projectStates, setProjectStates] = useState<OptionState[]>([]);
  const [projectMembers, setProjectMembers] = useState<OptionMember[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Lazily fetch this project's states/members only once the "More" panel is opened,
  // and again whenever the selected project changes while it's open.
  useEffect(() => {
    if (!isExpanded || !projectId) return;
    let cancelled = false;
    setLoadingOptions(true);

    Promise.all([
      fetch(`/api/plane?action=listStates&projectId=${projectId}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/plane?action=listMembers&projectId=${projectId}`).then((r) => r.json()).catch(() => []),
    ]).then(([statesRes, membersRes]) => {
      if (cancelled) return;
      const states: RawState[] = Array.isArray(statesRes) ? statesRes : statesRes.results || [];
      const members: RawMember[] = Array.isArray(membersRes) ? membersRes : membersRes.results || [];

      setProjectStates(states.map((s) => ({ id: s.id, name: s.name })));
      setProjectMembers(
        members
          .map((m): OptionMember => ({
            id: m.id || m.member?.id || '',
            name: `${m.member?.first_name || ''} ${m.member?.last_name || ''}`.trim() || m.member?.email || m.email || '',
          }))
          .filter((m) => m.id && m.name)
      );
      // Previously selected state/assignee likely belong to a different project now
      setStateId('');
      setAssigneeId('');
    }).finally(() => {
      if (!cancelled) setLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isExpanded, projectId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStateId('');
    setAssigneeId('');
    setDueDate('');
    setPriority('medium');
    setIsExpanded(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting || !projectId) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        projectId,
        name: title.trim(),
        priority,
      };
      if (description.trim()) payload.description_html = `<p>${description.trim()}</p>`;
      if (stateId) payload.state = stateId;
      if (assigneeId) payload.assignees = [assigneeId];
      if (dueDate) payload.target_date = dueDate;

      await fetch('/api/plane?action=createIssue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      resetForm();
      onTaskCreated();
    } catch (err) {
      console.error('Failed to quick-add task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0B0F14] border border-white/[0.08] rounded-xl focus-within:border-cyan-400/50 transition-colors shadow-sm"
    >
      {/* Compact primary row */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ Capture new operation / task..."
          className="min-w-0 flex-1 bg-transparent border-none outline-none text-xs text-[#FAFAFA] placeholder-[#71717A] px-2 font-mono"
        />

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className={`flex items-center gap-1 text-[10px] sm:text-[11px] rounded-lg px-2 py-1.5 font-mono border transition-colors shrink-0 cursor-pointer ${
            isExpanded
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              : 'bg-[#10151C] border-white/[0.08] text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span className="hidden sm:inline">More</span>
        </button>

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting || !projectId}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Capture</span>
              <span className="sm:hidden">Add</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded options panel */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-2.5 sm:p-3 space-y-2.5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full bg-[#10151C] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none font-mono resize-none focus:border-cyan-400/40"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectIdOverride(e.target.value)}
              className="bg-[#10151C] border border-white/[0.08] text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1.5 outline-none font-mono cursor-pointer truncate"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.identifier}
                </option>
              ))}
            </select>

            <select
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              disabled={loadingOptions || projectStates.length === 0}
              className="bg-[#10151C] border border-white/[0.08] text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1.5 outline-none font-mono cursor-pointer disabled:opacity-50 truncate"
            >
              <option value="">
                {loadingOptions ? 'Loading...' : 'Status: Backlog'}
              </option>
              {projectStates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-[#10151C] border border-white/[0.08] text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1.5 outline-none font-mono capitalize cursor-pointer"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={loadingOptions || projectMembers.length === 0}
              className="bg-[#10151C] border border-white/[0.08] text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1.5 outline-none font-mono cursor-pointer disabled:opacity-50 truncate"
            >
              <option value="">
                {loadingOptions ? 'Loading...' : 'Unassigned'}
              </option>
              {projectMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="col-span-2 sm:col-span-1 bg-[#10151C] border border-white/[0.08] text-[11px] text-[#A1A1AA] rounded-lg px-2 py-1.5 outline-none font-mono cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-[#52525B] truncate">
              {selectedProject ? `→ ${selectedProject.identifier} · ${selectedProject.name}` : 'Select a project'}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 text-[10px] font-mono text-[#71717A] hover:text-[#FAFAFA] px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
