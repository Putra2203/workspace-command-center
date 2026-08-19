import { NextRequest } from 'next/server';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { getNextFocusTask } from '@/domain/work_items/focus-queue';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return Response.json({ error: 'projectId parameter is required' }, { status: 400 });
    }

    const realProjectId = await planeService.resolveProjectId(projectId);
    const currentUser = await getCurrentUserContext(planeService);

    const [issues, states] = await Promise.all([
      planeService.listIssues(realProjectId),
      planeService.listStates(realProjectId),
    ]);

    const nextTask = getNextFocusTask(issues, states, currentUser?.userId || null);

    return Response.json({ task: nextTask });
  } catch (error: any) {
    console.error('Error in GET /api/focus/next:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
