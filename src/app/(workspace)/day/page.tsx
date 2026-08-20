'use client';

import { MyDayDashboard } from '@/components/dashboard/MyDayDashboard';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaceData } from '@/lib/context/workspace-data';

export default function DayPage() {
  const { currentUser, activeProjectKey } = useWorkspaceStore();
  const { issues, states, memberMap, fetchProjectData } = useWorkspaceData();

  return (
    <MyDayDashboard
      issues={issues}
      states={states}
      memberMap={memberMap}
      currentUserId={currentUser?.id || null}
      activeProjectKey={activeProjectKey}
      onRefreshNeeded={fetchProjectData}
    />
  );
}
