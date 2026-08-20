'use client';

import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  X,
  Check,
  Plus,
  Loader2,
  CornerUpLeft,
  MessageSquare,
  GitBranch,
  CalendarClock,
  Ruler,
  Tag,
  Users,
  Clock,
  UserPlus,
} from 'lucide-react';
import type { PlaneLabel, PlaneIssueComment } from '@/types/plane';

interface StateLike {
  id?: string;
  name: string;
  group: string;
  color?: string;
}

// Deliberately loose — each page (My Day, Issues, Board) keeps its own
// slightly different local Issue shape (some make `name` optional and
// fall back to `title`), so this accepts whatever shape any of them pass.
export interface WorkItemLike {
  id: string;
  name?: string;
  title?: string;
  sequence_id?: number;
  priority?: string;
  state?: any;
  state_detail?: { id?: string; name: string; group: string; color?: string };
  assignees?: string[];
  project_detail?: { identifier: string };
  description_html?: string;
  start_date?: string | null;
  target_date?: string | null;
  estimate_point?: number | null;
  parent?: string | null;
  labels?: string[];
  created_at?: string;
  updated_at?: string;
}

interface WorkItemDetailPanelProps {
  issue: WorkItemLike;
  allIssues: WorkItemLike[];
  states: StateLike[];
  memberMap: Map<string, string>;
  activeProjectKey: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onOpenIssue: (issueId: string) => void;
  onChanged: () => void;
}

function titleOf(issue: WorkItemLike): string {
  return issue.name || issue.title || 'Untitled';
}

function stateIdOf(issue: WorkItemLike): string {
  if (typeof issue.state === 'string') return issue.state;
  return (issue.state as { id?: string } | undefined)?.id || issue.state_detail?.id || '';
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low', 'none'];

// DOMPurify has no window during SSR and throws rather than no-op'ing —
// this component only ever mounts client-side after a click, but guard
// anyway so a future eager-render can't slip unsanitized HTML through.
function safeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return '';
  return DOMPurify.sanitize(html);
}

export function WorkItemDetailPanel({
  issue,
  allIssues,
  states,
  memberMap,
  activeProjectKey,
  currentUserId,
  onClose,
  onOpenIssue,
  onChanged,
}: WorkItemDetailPanelProps) {
  const projectKey = issue.project_detail?.identifier || activeProjectKey || 'PROJECT1';
  const issueKey = `${projectKey}-${issue.sequence_id}`;

  const [labels, setLabels] = useState<PlaneLabel[]>([]);
  const [comments, setComments] = useState<PlaneIssueComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [newSubIssueTitle, setNewSubIssueTitle] = useState('');
  const [addingSubIssue, setAddingSubIssue] = useState(false);
  const [savingField, setSavingField] = useState<'priority' | 'state' | 'assign' | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/plane?action=listLabels&projectId=${encodeURIComponent(projectKey)}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (isMounted) setLabels(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [projectKey]);

  useEffect(() => {
    let isMounted = true;
    setLoadingComments(true);
    fetch(`/api/plane?action=listComments&projectId=${encodeURIComponent(projectKey)}&issueId=${issue.id}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (isMounted) setComments(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingComments(false);
      });
    return () => { isMounted = false; };
  }, [projectKey, issue.id]);

  const stateDetail = useMemo(
    () => states.find(s => s.id === stateIdOf(issue)),
    [states, issue]
  );

  const doneState = useMemo(
    () => states.find(s => s.group?.toLowerCase() === 'completed' || s.name.toLowerCase() === 'done'),
    [states]
  );

  const subIssues = useMemo(
    () => allIssues.filter(i => i.parent === issue.id),
    [allIssues, issue.id]
  );

  const parentIssue = useMemo(
    () => (issue.parent ? allIssues.find(i => i.id === issue.parent) || null : null),
    [allIssues, issue.parent]
  );

  const issueLabels = useMemo(
    () => labels.filter(l => (issue.labels || []).includes(l.id)),
    [labels, issue.labels]
  );

  const assigneeNames = (issue.assignees || []).map(id => memberMap.get(id) || 'Unknown');

  const sanitizedDescription = useMemo(
    () => safeHtml(issue.description_html || ''),
    [issue.description_html]
  );

  const patchIssue = async (data: Record<string, any>) => {
    await fetch('/api/plane?action=updateIssue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: projectKey, issueId: issue.id, ...data }),
    });
    onChanged();
  };

  const handlePriorityChange = async (priority: string) => {
    setSavingField('priority');
    try {
      await patchIssue({ priority });
    } finally {
      setSavingField(null);
    }
  };

  const handleStateChange = async (stateId: string) => {
    setSavingField('state');
    try {
      await patchIssue({ state: stateId });
    } finally {
      setSavingField(null);
    }
  };

  const handleAssignToMe = async () => {
    if (!currentUserId) return;
    setSavingField('assign');
    try {
      await patchIssue({ assignees: [currentUserId] });
    } finally {
      setSavingField(null);
    }
  };

  const handleMarkSubIssueDone = async (subIssue: WorkItemLike) => {
    if (!doneState?.id) return;
    await fetch('/api/plane?action=updateIssue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: subIssue.project_detail?.identifier || projectKey,
        issueId: subIssue.id,
        state: doneState.id,
      }),
    });
    onChanged();
  };

  const handleAddSubIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubIssueTitle.trim() || addingSubIssue) return;
    setAddingSubIssue(true);
    try {
      await fetch('/api/plane?action=createIssue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectKey, name: newSubIssueTitle.trim(), parent: issue.id }),
      });
      setNewSubIssueTitle('');
      onChanged();
    } catch (err) {
      console.error('Failed to add sub-issue:', err);
    } finally {
      setAddingSubIssue(false);
    }
  };

  const refetchComments = () => {
    fetch(`/api/plane?action=listComments&projectId=${encodeURIComponent(projectKey)}&issueId=${issue.id}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => setComments(Array.isArray(data) ? data : data.results || []))
      .catch(() => {});
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await fetch('/api/plane?action=addComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectKey, issueId: issue.id, comment_html: `<p>${newComment.trim()}</p>` }),
      });
      setNewComment('');
      refetchComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full sm:w-[560px] h-full bg-[#0B0B0D] border-l border-white/10 overflow-y-auto scrollbar-thin p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {issueKey}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA] hover:border-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {parentIssue && (
          <button
            onClick={() => onOpenIssue(parentIssue.id)}
            className="flex items-center gap-1.5 text-[11px] text-[#71717A] hover:text-blue-400 transition-colors"
          >
            <CornerUpLeft className="w-3 h-3" />
            <span className="truncate">Parent: {projectKey}-{parentIssue.sequence_id} — {titleOf(parentIssue)}</span>
          </button>
        )}

        <h2 className="text-base font-bold text-[#FAFAFA] leading-snug">{titleOf(issue)}</h2>

        {/* Quick fields */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={issue.priority || 'none'}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={savingField === 'priority'}
            className="bg-[#111113] border border-white/10 text-[11px] text-[#A1A1AA] rounded px-2 py-1 outline-none font-mono capitalize disabled:opacity-50"
          >
            {PRIORITY_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={stateDetail?.id || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={savingField === 'state'}
            className="bg-[#111113] border border-white/10 text-[11px] rounded px-2 py-1 outline-none font-mono disabled:opacity-50"
            style={{ color: stateDetail?.color || '#A1A1AA' }}
          >
            {states.map(s => (
              <option key={s.id} value={s.id} style={{ color: '#FAFAFA' }}>{s.name}</option>
            ))}
          </select>

          {(!issue.assignees || issue.assignees.length === 0) && currentUserId && (
            <button
              onClick={handleAssignToMe}
              disabled={savingField === 'assign'}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#111113] border border-white/10 hover:border-blue-500/40 text-[11px] text-[#71717A] hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {savingField === 'assign' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              <span>Assign to me</span>
            </button>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#71717A]">Assignees</div>
              <div className="text-[#FAFAFA] truncate">{assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned'}</div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#71717A]">Labels</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {issueLabels.length > 0 ? issueLabels.map(l => (
                  <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: l.color, borderColor: `${l.color}40` }}>
                    {l.name}
                  </span>
                )) : <span className="text-[#52525B]">None</span>}
              </div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#71717A]">Start → Due</div>
              <div className="text-[#FAFAFA] font-mono text-[11px]">{formatDate(issue.start_date)} → {formatDate(issue.target_date)}</div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#71717A]">Estimate</div>
              <div className="text-[#FAFAFA] font-mono text-[11px]">{issue.estimate_point ?? '—'}</div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center gap-2 col-span-2">
            <Clock className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <div className="min-w-0 text-[11px] text-[#71717A] font-mono">
              Created {formatDate(issue.created_at)} · Updated {formatDate(issue.updated_at)}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1.5">Description</h3>
          {sanitizedDescription ? (
            <div
              className="text-sm text-[#D4D4D8] leading-relaxed p-3 rounded-lg bg-[#111113] border border-white/5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-400 [&_a]:underline [&_strong]:font-semibold [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-3 [&_blockquote]:text-[#A1A1AA]"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          ) : (
            <p className="text-xs text-[#52525B] px-1">No description.</p>
          )}
        </div>

        {/* Sub-issues */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              Sub-items
            </h3>
            <span className="text-[10px] font-mono text-[#52525B] bg-[#111113] px-2 py-0.5 rounded border border-white/5">
              {subIssues.length}
            </span>
          </div>

          <div className="space-y-1 mb-2">
            {subIssues.map(sub => {
              const isDone = ['completed', 'cancelled'].includes(
                (states.find(s => s.id === stateIdOf(sub))?.group || '').toLowerCase()
              );
              return (
                <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#111113] border border-white/5 hover:border-white/10 transition-colors">
                  <button
                    onClick={() => handleMarkSubIssueDone(sub)}
                    title="Mark Done"
                    disabled={isDone}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isDone ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'border-white/20 hover:border-green-400 hover:bg-green-500/20 text-[#71717A] hover:text-green-400'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => onOpenIssue(sub.id)} className="flex-1 min-w-0 text-left flex items-center gap-2">
                    <span className="text-[10px] text-blue-400 font-mono shrink-0">{projectKey}-{sub.sequence_id}</span>
                    <span className={`text-xs truncate ${isDone ? 'text-[#71717A] line-through' : 'text-[#FAFAFA]'}`}>{titleOf(sub)}</span>
                  </button>
                </div>
              );
            })}
            {subIssues.length === 0 && (
              <p className="text-xs text-[#52525B] px-1">No sub-items yet.</p>
            )}
          </div>

          <form onSubmit={handleAddSubIssue} className="flex items-center gap-2">
            <input
              type="text"
              value={newSubIssueTitle}
              onChange={(e) => setNewSubIssueTitle(e.target.value)}
              placeholder="Add a sub-item..."
              className="flex-1 bg-[#111113] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none focus:border-blue-500/50"
            />
            <button
              type="submit"
              disabled={!newSubIssueTitle.trim() || addingSubIssue}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
            >
              {addingSubIssue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Comments */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>

          <div className="space-y-2 mb-2">
            {loadingComments ? (
              <div className="flex items-center gap-2 text-xs text-[#71717A] px-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-[#52525B] px-1">No comments yet.</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="p-2.5 rounded-lg bg-[#111113] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#A1A1AA]">{memberMap.get(c.actor) || 'Unknown'}</span>
                    <span className="text-[10px] font-mono text-[#52525B]">{formatDate(c.created_at)}</span>
                  </div>
                  <div
                    className="text-xs text-[#D4D4D8] [&_p]:mb-1"
                    dangerouslySetInnerHTML={{ __html: safeHtml(c.comment_html || '') }}
                  />
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-[#111113] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none focus:border-blue-500/50"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || postingComment}
              className="px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-white/10 hover:bg-[#27272A] text-xs text-[#FAFAFA] flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
            >
              {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
