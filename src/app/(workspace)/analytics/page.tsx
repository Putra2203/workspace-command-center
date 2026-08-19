'use client';

import { BarChart3 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function AnalyticsPage() {
  const { activeProjectKey } = useWorkspaceStore();

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
        <BarChart3 className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-xl font-semibold text-[#FAFAFA] mb-2">Project Health Analytics</h2>
      <p className="text-[#71717A] max-w-md text-sm">
        Live velocity, cycle completion stats, and risk tracking for <span className="text-blue-400 font-mono">{activeProjectKey}</span> are actively synchronized.
      </p>
    </div>
  );
}
