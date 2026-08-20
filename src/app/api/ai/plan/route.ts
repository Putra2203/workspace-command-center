import { NextRequest } from 'next/server';
import { parseIntentAsync, buildActionPlanFromIntentAsync } from '@/lib/ai/intent-engine';
import { classifyIntentTier } from '@/lib/ai/router';
import { executeIntent } from '@/lib/ai/executor';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { findSimilarIssues } from '@/domain/work_items/duplicate-detection';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { scrubPII } from '@/lib/security/pii-scrubber';
import { logAiUsage } from '@/infrastructure/telemetry/ai-usage-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, 30);
    if (!rateCheck.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please wait a moment before sending more AI requests.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, projectId, userScope, image } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Valid message string is required' }, { status: 400 });
    }

    const cleanMessage = scrubPII(message);

    // Multi-modal vision: if image is attached, analyze it with Gemini Vision
    let visionContext = '';
    if (image?.base64Data && image?.mimeType) {
      try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (apiKey) {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey });
          const visionResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                inlineData: {
                  mimeType: image.mimeType,
                  data: image.base64Data,
                },
              },
              `Analyze this screenshot/image for project management purposes.
Extract: bug title (if it's a bug), detailed description or reproduction steps, suggested priority (urgent/high/medium/low), and suggested labels.
If it's a design mockup, describe the UI elements and suggest a feature task title.
Respond in JSON format: { "title": "...", "description": "...", "priority": "...", "labels": ["..."], "type": "bug|feature|task" }`,
            ],
          });
          const visionText = typeof (visionResult as any).text === 'function'
            ? (visionResult as any).text()
            : (visionResult as any).text;
          if (visionText) {
            visionContext = `\n[Vision Analysis]: ${visionText}`;
          }
        }
      } catch (visionErr) {
        console.warn('Vision analysis failed, continuing with text-only:', visionErr);
      }
    }

    const enrichedMessage = cleanMessage + visionContext;

    const intentResult = await parseIntentAsync(enrichedMessage, {
      activeProjectId: projectId,
      activeProjectKey: projectId,
    });


    if (!intentResult.entities.projectKey && projectId) {
      intentResult.entities.projectKey = projectId;
    }

    const tier = classifyIntentTier(intentResult.intent);

    // Build plan asynchronously (supports decomposition & duplicate checks)
    const plan = await buildActionPlanFromIntentAsync(intentResult, { activeProjectId: projectId, activeProjectKey: projectId });

    // Calculate exact tokens (Gemini standard: ~3.8 chars/token + 258 tokens per vision image tile)
    const imageTokenCount = image?.base64 ? 258 : 0;
    const inputTokens = Math.max(10, Math.ceil(cleanMessage.length / 3.8) + imageTokenCount);
    const outputContent = (intentResult.entities.chatReply || '') + (plan ? JSON.stringify(plan) : '');
    const outputTokens = Math.max(20, Math.ceil(outputContent.length / 3.8));

    // Telemetry log
    logAiUsage({
      feature: `intent_${intentResult.intent}`,
      model: tier === 'heavy' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite',
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      success: true,
    });

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
