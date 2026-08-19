'use client';

import { ChatInterface } from '@/components/ai/ChatInterface';
import { useWorkspaceData } from '@/lib/context/workspace-data';

export default function CommandPage() {
  const { fetchProjectData } = useWorkspaceData();
  return <ChatInterface onActionExecuted={fetchProjectData} />;
}
