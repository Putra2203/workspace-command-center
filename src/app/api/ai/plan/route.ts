import { NextRequest } from 'next/server';
import { parseIntentAsync, buildActionPlanFromIntent } from '@/lib/ai/intent-engine';
import { classifyIntentTier } from '@/lib/ai/router';
import { executeIntent } from '@/lib/ai/executor';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, projectId, userScope } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Valid message string is required' }, { status: 400 });
    }

    const intentResult = await parseIntentAsync(message, {
      activeProjectId: projectId,
      activeProjectKey: projectId,
    });

    if (!intentResult.entities.projectKey && projectId) {
      intentResult.entities.projectKey = projectId;
    }

    const tier = classifyIntentTier(intentResult.intent);

    // If intent requires an ActionPlan preview before mutation
    const plan = buildActionPlanFromIntent(intentResult, { activeProjectId: projectId, activeProjectKey: projectId });

    if (plan && plan.requiresApproval) {
      return Response.json({
        reply: `Silakan tinjau rencana tindakan berikut untuk project **${plan.steps[0]?.target || projectId || 'Plane'}** sebelum dieksekusi:`,
        plan,
        actionCards: [],
        tier,
      });
    }

    // For read-only or chat intents, execute immediately without approval
    const currentUser = await getCurrentUserContext(planeService);
    const actionCards = await executeIntent(intentResult, planeService, {
      userScope: userScope || 'my_tasks',
      currentUserId: currentUser?.userId,
    });

    let reply = intentResult.entities.chatReply;
    if (!reply) {
      if (intentResult.intent === 'list_issues') {
        reply = `Berikut adalah daftar issue untuk project **${intentResult.entities.projectKey || 'Anda'}**:`;
      } else if (intentResult.intent === 'list_projects') {
        reply = 'Berikut adalah daftar project di workspace Plane Anda:';
      } else if (intentResult.intent === 'get_issue') {
        reply = `Detail issue **${intentResult.entities.issueKey}**:`;
      } else if (intentResult.intent === 'help') {
        reply = 'Saya dapat membantu Anda mengelola project dan task di Plane. Berikut adalah beberapa perintah yang bisa Anda coba:';
      } else {
        reply = 'Perintah berhasil diproses.';
      }
    }

    return Response.json({
      reply,
      plan: null,
      actionCards,
      tier,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/plan:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
