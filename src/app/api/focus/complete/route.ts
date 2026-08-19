import { NextRequest } from 'next/server';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { getNextFocusTask } from '@/domain/work_items/focus-queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, projectId } = body;

    if (!issueId || !projectId) {
      return Response.json({ error: 'issueId and projectId are required' }, { status: 400 });
    }

    const realProjectId = await planeService.resolveProjectId(projectId);
    const realIssueId = await planeService.resolveIssueId(realProjectId, issueId);
    const doneStateId = await planeService.resolveStateId(realProjectId, 'done');

    // Mark current focus issue as Done in Plane API
    await planeService.updateIssue(realProjectId, realIssueId, { state: doneStateId });

    const currentUser = await getCurrentUserContext(planeService);

    // Refresh issues list and return the next highest priority task in queue
    const [issues, states] = await Promise.all([
      planeService.listIssues(realProjectId),
      planeService.listStates(realProjectId),
    ]);

    const nextTask = getNextFocusTask(issues, states, currentUser?.userId || null);

    return Response.json({
      success: true,
      completedIssueId: issueId,
      nextTask,
    });
  } catch (error: any) {
    console.error('Error in POST /api/focus/complete:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
