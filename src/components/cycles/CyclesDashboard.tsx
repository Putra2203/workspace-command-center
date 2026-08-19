'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Calendar, Plus, CheckCircle2, Clock, ChevronRight, X, Loader2, FolderKanban } from 'lucide-react';
import { PlaneCycle, PlaneIssue } from '@/types/plane';
import { PlaneStateLike } from '@/domain/work_items/my-day';
import { categorizeCycles, calculateCycleProgress, formatCycleDate } from '@/domain/cycles/cycles-helper';
import { Project } from '@/lib/context/workspace-data';

interface CyclesDashboardProps {
  activeProjectKey: string | null;
  projects?: Project[];
  issues: PlaneIssue[];
  states: PlaneStateLike[];
}

export function CyclesDashboard({ activeProjectKey, projects = [], issues, states }: CyclesDashboardProps) {
  const [cycles, setCycles] = useState<PlaneCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [selectedCycle, setSelectedCycle] = useState<PlaneCycle | null>(null);
  const [cycleIssues, setCycleIssues] = useState<PlaneIssue[]>([]);
  const [loadingCycleIssues, setLoadingCycleIssues] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Cycle form state
  const [newCycleName, setNewCycleName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [targetCreateProject, setTargetCreateProject] = useState(projects[0]?.id || '');
  const [isCreating, setIsCreating] = useState(false);

  const fetchCycles = async () => {
    setLoading(true);
    try {
      if (activeProjectKey === 'ALL' && projects.length > 0) {
        const cyclePromises = projects.map(p =>
          fetch(`/api/plane?action=listCycles&projectId=${p.id}`)
            .then(res => res.json())
            .then(data => {
              const list = Array.isArray(data) ? data : data.results || [];
              return list.map((c: any) => ({
                ...c,
                project_detail: { id: p.id, name: p.name, identifier: p.identifier },
              }));
            })
            .catch(() => [])
        );
        const allCyclesArrays = await Promise.all(cyclePromises);
        setCycles(allCyclesArrays.flat());
      } else {
        const targetProjectObj = projects.find(p => p.id === activeProjectKey || p.identifier === activeProjectKey) || projects[0];
        const targetProjectId = targetProjectObj?.id || activeProjectKey || 'PROJECT1';
        
        const res = await fetch(`/api/plane?action=listCycles&projectId=${targetProjectId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          const decorated = list.map((c: any) => ({
            ...c,
            project_detail: targetProjectObj
              ? { id: targetProjectObj.id, name: targetProjectObj.name, identifier: targetProjectObj.identifier }
              : c.project_detail,
          }));
          setCycles(decorated);
        }
      }
    } catch (err) {
      console.error('Failed to load cycles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [activeProjectKey, projects]);

  // Fetch live issues when a Cycle is selected
  useEffect(() => {
    if (!selectedCycle) {
      setCycleIssues([]);
      return;
    }

    let isMounted = true;
    async function loadCycleIssues() {
      setLoadingCycleIssues(true);
      try {
        const projId = selectedCycle?.project_detail?.id || selectedCycle?.project_detail?.identifier || activeProjectKey || 'PROJECT1';
        const res = await fetch(`/api/plane?action=listCycleIssues&projectId=${projId}&cycleId=${selectedCycle?.id}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (isMounted) setCycleIssues(list);
        }
      } catch (err) {
        console.error('Failed to load cycle issues:', err);
      } finally {
        if (isMounted) setLoadingCycleIssues(false);
      }
    }

    loadCycleIssues();
    return () => { isMounted = false; };
  }, [selectedCycle, activeProjectKey]);

  const { active, upcoming, completed } = useMemo(
    () => categorizeCycles(cycles),
    [cycles]
  );

  const heroCycle = active[0] || cycles[0] || null;
  const heroProgress = useMemo(
    () => (heroCycle ? calculateCycleProgress(heroCycle, issues, states, heroCycle.project_detail?.identifier) : null),
    [heroCycle, issues, states]
  );

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const projToUse = targetCreateProject || (activeProjectKey === 'ALL' ? projects[0]?.id : activeProjectKey) || 'PROJECT1';
      const res = await fetch('/api/plane?action=createCycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projToUse,
          data: {
            name: newCycleName.trim(),
            start_date: newStartDate || undefined,
            end_date: newEndDate || undefined,
          },
        }),
      });

      if (res.ok) {
        setNewCycleName('');
        setNewStartDate('');
        setNewEndDate('');
        setShowCreateModal(false);
        fetchCycles();
      }
    } catch (err) {
      console.error('Failed to create cycle:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const displayedCycles = activeTab === 'active' ? active : activeTab === 'upcoming' ? upcoming : completed;

  const displayCycleIssues = useMemo(() => {
    if (cycleIssues.length > 0) return cycleIssues;
    if (!selectedCycle) return [];
    const projId = selectedCycle.project_detail?.identifier;
    const cycleId = selectedCycle.id;
    return issues.filter((i: any) => {
      if (i.cycle_id === cycleId || i.cycle === cycleId) return true;
      if (projId && i.project_detail?.identifier === projId) return true;
      return false;
    });
  }, [cycleIssues, selectedCycle, issues]);

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Cycles & Sprint Iterations</h2>
          <p className="text-xs text-[#71717A] mt-1">
            Manage sprint cycles in <span className="font-mono text-blue-400">{activeProjectKey || 'All Projects'}</span> — track progress & velocity.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Cycle</span>
        </button>
      </div>

      {/* Hero Active Cycle Banner */}
      {heroCycle && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#111113] to-purple-950/40 border border-blue-500/30 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Active Sprint Cycle
                </span>
                {heroCycle.project_detail?.identifier && (
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {heroCycle.project_detail.identifier}
                  </span>
                )}
                {heroCycle.start_date && (
                  <span className="text-xs text-[#71717A] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{formatCycleDate(heroCycle.start_date)} → {formatCycleDate(heroCycle.end_date) || 'Ongoing'}</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-[#FAFAFA]">{heroCycle.name}</h3>
            </div>

            {heroProgress && (
              <div className="w-full md:w-64 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#71717A]">Sprint Progress</span>
                  <span className="text-blue-400 font-semibold">{heroProgress.percentage}%</span>
                </div>
                <div className="w-full bg-[#18181B] h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${heroProgress.percentage}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#71717A] text-right font-mono">
                  {heroProgress.completed} of {heroProgress.total} tasks done
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
        {(['active', 'upcoming', 'completed'] as const).map((tab) => {
          const count = tab === 'active' ? active.length : tab === 'upcoming' ? upcoming.length : completed.length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#111113]'
              }`}
            >
              <span>{tab} Cycles</span>
              <span className="text-[10px] font-mono bg-[#18181B] px-1.5 py-0.5 rounded border border-white/5">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cycles Grid */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-xs text-[#71717A] gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Loading Cycles from Plane API...</span>
        </div>
      ) : displayedCycles.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#71717A] bg-[#111113] rounded-2xl border border-white/5">
          <RefreshCw className="w-8 h-8 text-[#3F3F46] mx-auto mb-2" />
          <p>No {activeTab} cycles found for this project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCycles.map((cycle) => {
            const prog = calculateCycleProgress(cycle, issues, states, cycle.project_detail?.identifier);
            return (
              <div
                key={`${cycle.project_detail?.identifier || 'p'}-${cycle.id}`}
                onClick={() => setSelectedCycle(cycle)}
                className="p-4 rounded-xl bg-[#111113] border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {cycle.project_detail?.identifier && (
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded shrink-0">
                        {cycle.project_detail.identifier}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#FAFAFA] group-hover:text-blue-400 transition-colors truncate">
                      {cycle.name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#52525B] group-hover:text-blue-400 transition-colors shrink-0" />
                </div>

                {cycle.project_detail?.name && (
                  <div className="text-[11px] text-[#71717A] flex items-center gap-1.5 truncate">
                    <FolderKanban className="w-3 h-3 text-[#52525B] shrink-0" />
                    <span className="truncate">{cycle.project_detail.name}</span>
                  </div>
                )}

                {cycle.start_date && (
                  <div className="text-xs text-[#71717A] flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{formatCycleDate(cycle.start_date)} ~ {formatCycleDate(cycle.end_date) || 'End'}</span>
                  </div>
                )}

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#71717A]">
                    <span>Progress</span>
                    <span className="text-blue-400">{prog.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#18181B] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#71717A] text-right font-mono">
                    {prog.completed} of {prog.total} tasks done
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Cycle Detail Drawer */}
      {selectedCycle && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end cursor-pointer"
          onClick={() => setSelectedCycle(null)}
        >
          <div
            className="w-full max-w-md bg-[#09090B] border-l border-white/10 p-6 overflow-y-auto space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Cycle Detail</span>
                  {selectedCycle.project_detail?.identifier && (
                    <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {selectedCycle.project_detail.identifier}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA]">{selectedCycle.name}</h3>
              </div>
              <button
                onClick={() => setSelectedCycle(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#71717A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedCycle.start_date && (
              <div className="text-xs text-[#71717A] font-mono bg-[#111113] p-2.5 rounded-lg border border-white/5">
                📅 {formatCycleDate(selectedCycle.start_date)} → {formatCycleDate(selectedCycle.end_date) || 'No End Date'}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-[#71717A]">
                Cycle Issues ({displayCycleIssues.length})
              </h4>
              {loadingCycleIssues && displayCycleIssues.length === 0 ? (
                <div className="py-6 flex items-center justify-center text-xs text-[#71717A] gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Loading cycle tasks...</span>
                </div>
              ) : displayCycleIssues.length === 0 ? (
                <p className="text-xs text-[#52525B]">Belum ada issue terhubung ke cycle ini.</p>
              ) : (
                displayCycleIssues.slice(0, 15).map((issue) => (
                  <div key={issue.id} className="p-2.5 rounded-lg bg-[#111113] border border-white/5 text-xs text-[#FAFAFA] flex items-center justify-between">
                    <span className="truncate font-medium">{issue.name || (issue as any).title}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#111113] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#FAFAFA]">Buat Cycle/Sprint Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#71717A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-3">
              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-[#71717A] block mb-1">Target Project</label>
                  <select
                    value={targetCreateProject}
                    onChange={(e) => setTargetCreateProject(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#FAFAFA] outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.identifier})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[#71717A] block mb-1">Nama Cycle</label>
                <input
                  type="text"
                  required
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g. Sprint 14 — User Auth & Dashboard"
                  className="w-full bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#FAFAFA] outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-[#71717A] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#FAFAFA] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#71717A] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#18181B] text-xs text-[#A1A1AA] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newCycleName.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Buat Cycle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
