import { NextRequest } from 'next/server';
import { POST as PlanPOST } from './plan/route';

/**
 * Main AI API handler, delegating to the /api/ai/plan workflow for Plan-Approve-Execute architecture.
 */
export async function POST(request: NextRequest) {
  return PlanPOST(request);
}
