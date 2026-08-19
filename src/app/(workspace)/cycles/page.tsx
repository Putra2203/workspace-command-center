'use client';

import { CyclesDashboard } from '@/components/cycles/CyclesDashboard';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';

export default function CyclesPage() {
  const { activeProjectKey } = useWorkspaceStore();
  const { projects, issues, states } = useWorkspaceData();

  return (
    <CyclesDashboard
      activeProjectKey={activeProjectKey}
      projects={projects}
      issues={issues}
      states={states}
    />
  );
}
