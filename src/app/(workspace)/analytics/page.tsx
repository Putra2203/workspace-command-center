'use client';

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';

export default function AnalyticsPage() {
  const { activeProjectKey } = useWorkspaceStore();
  const { projects, issues, states } = useWorkspaceData();

  return (
    <AnalyticsDashboard
      activeProjectKey={activeProjectKey}
      projects={projects}
      issues={issues}
      states={states}
    />
  );
}
