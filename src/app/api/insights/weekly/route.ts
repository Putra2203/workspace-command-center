import { NextRequest } from 'next/server';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { InsightService } from '@/application/services/InsightService';
import { getCurrentUserContext } from '@/lib/context/current-user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return Response.json({ error: 'projectId is required' }, { status: 400 });
    }

    const realProjectId = await planeService.resolveProjectId(projectId);
    const currentUser = await getCurrentUserContext(planeService);

    const insightService = new InsightService(planeService);
    const weeklyReview = await insightService.getWeeklyReview(realProjectId, currentUser?.userId || null);

    return Response.json(weeklyReview);
  } catch (error: any) {
    console.error('Error in GET /api/insights/weekly:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
