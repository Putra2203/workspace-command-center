import { NextRequest } from 'next/server';
import { parseIntentAsync, buildActionPlanFromIntentAsync } from '@/lib/ai/intent-engine';
import { classifyIntentTier } from '@/lib/ai/router';
import { executeIntent } from '@/lib/ai/executor';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { findSimilarIssues } from '@/domain/work_items/duplicate-detection';

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

    // Build plan asynchronously (supports decomposition & duplicate checks)
    const plan = await buildActionPlanFromIntentAsync(intentResult, { activeProjectId: projectId, activeProjectKey: projectId });

    if (plan && plan.requiresApproval) {
      // Duplicate detection check
      if (projectId && (intentResult.intent === 'create_issue' || intentResult.intent === 'batch_create_issues')) {
        try {
          const realProjectId = await planeService.resolveProjectId(projectId);
          const existingIssues = await planeService.listIssues(realProjectId);
          const firstTitle = (plan.steps[0]?.changes?.title as string) || '';
          const duplicates = findSimilarIssues(firstTitle, existingIssues, 65);

          if (duplicates.length > 0) {
            plan.summary += ` ⚠️ (Kemungkinan duplikat ditemukan: "${duplicates[0].title}" - ${duplicates[0].similarity}% mirip)`;
          }
        } catch (dupErr) {
          console.warn('Duplicate check failed silently:', dupErr);
        }
      }

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
        reply = 'Saya dapat membantu Anda mengelola project dan task di Plane. Perintah yang bisa Anda coba:\n- *"Pecah feature login menjadi subtask"*\n- *"Buat task fix bug"*\n- *"Tampilkan daftar project"*';
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
