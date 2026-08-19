'use client';

import { ChatInterface } from '@/components/ai/ChatInterface';
import { useWorkspaceData } from '@/lib/context/workspace-data';

// Cycles isn't implemented yet — preserving the exact pre-routing behavior
// (the old view-switch had no 'cycles' case, so it fell through to the
// default: ChatInterface). Not a deliberate design choice, just parity.
export default function CyclesPage() {
  const { fetchProjectData } = useWorkspaceData();
  return <ChatInterface onActionExecuted={fetchProjectData} />;
}
