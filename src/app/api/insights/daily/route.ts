import { NextRequest } from 'next/server';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { InsightService } from '@/application/services/InsightService';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return Response.json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    let currentUserId: string | null = null;
    try {
      currentUserId = (await getCurrentUserContext(planeService)).userId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to resolve current user for daily briefing:', message);
      // Fail closed on identity, not on the whole request — the briefing
      // still returns with zeroed "my" metrics rather than erroring out.
    }

    const insightService = new InsightService(planeService);
    const briefing = await insightService.getDailyBriefing(projectId, currentUserId);
    return Response.json(briefing);
  } catch (error: unknown) {
    const appError = AppError.fromUnknown(error);
    console.error('Daily Briefing API Error:', appError.code, appError.message);
    return Response.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.httpStatus }
    );
  }
}
