import { NextRequest } from 'next/server';
import { parseIntentAsync, buildActionPlanFromIntentAsync, type ChatHistoryTurn } from '@/lib/ai/intent-engine';
import { classifyIntentTier } from '@/lib/ai/router';
import { executeIntent } from '@/lib/ai/executor';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { findSimilarIssues } from '@/domain/work_items/duplicate-detection';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { scrubPII } from '@/lib/security/pii-scrubber';
import { logAiUsage } from '@/infrastructure/telemetry/ai-usage-logger';
import { prisma } from '@/infrastructure/db/client';

const CHAT_HISTORY_WINDOW = 10;

// The frontend persists the user's turn via a fire-and-forget PUT that can race ahead of
// this request, and for slash commands (/plan, /today, ...) the persisted content (raw input,
// e.g. "/plan Payment Gateway") differs from the message this route receives (the expanded
// command, e.g. "pecah feature Payment Gateway menjadi subtask") — so a content-equality check
// can't reliably catch it. Recency is a more robust signal: any 'user' row written in the last
// few seconds is almost certainly that same race, not a genuine earlier turn.
const RECENT_DUPLICATE_WINDOW_MS = 5000;

/**
 * Fetches the last N messages of a session for multi-turn intent resolution
 * (e.g. "ubah priority-nya jadi urgent" referring to an issue mentioned earlier).
 * Best-effort: local/uninitialized sessions or a missing Prisma model return no history.
 */
async function fetchRecentChatHistory(sessionId: unknown): Promise<ChatHistoryTurn[]> {
  if (typeof sessionId !== 'string' || !sessionId || sessionId.startsWith('local-')) {
    return [];
  }
  try {
    const recent = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: CHAT_HISTORY_WINDOW,
      select: { role: true, content: true, createdAt: true },
    });
    const chronological = recent.reverse();

    const last = chronological[chronological.length - 1];
    if (last && last.role === 'user' && Date.now() - last.createdAt.getTime() < RECENT_DUPLICATE_WINDOW_MS) {
      chronological.pop();
    }

    return chronological.map((m) => ({ role: m.role as ChatHistoryTurn['role'], content: m.content }));
  } catch (err) {
    console.warn('Failed to fetch chat history for multi-turn context:', err);
    return [];
  }
}

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
    const { message, projectId, userScope, image, sessionId } = body;

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

    // Fetch workspace context concurrently
    const [projects, currentUser, chatHistory] = await Promise.all([
      planeService.listProjects().catch(() => []),
      getCurrentUserContext(planeService).catch(() => null),
      fetchRecentChatHistory(sessionId),
    ]);

    const availableProjects = projects.map(p => ({ id: p.id, identifier: p.identifier, name: p.name }));

    // Best-effort fetch of members/states for the active project, so batch task
    // creation can resolve assignee names and status labels mentioned in chat.
    const isBatchLikely = /\n\s*\d+[\.\)]|\bbuat\b.*\btask|\bcreate\b.*\btask|\btambah\b.*\btask/i.test(cleanMessage) ||
      /^\s*\d+[\.\)]\s*.+?:/m.test(cleanMessage);
    let availableMembers: { id: string; name: string; email: string }[] = [];
    let availableStates: { id: string; name: string; group: string }[] = [];
    if (isBatchLikely && projectId) {
      try {
        const realProjectId = await planeService.resolveProjectId(projectId);
        const [members, states] = await Promise.all([
          planeService.listMembers(realProjectId).catch(() => []),
          planeService.listStates(realProjectId).catch(() => []),
        ]);
        availableMembers = members
          .map((m: any) => ({
            id: m.id,
            name: `${m.member?.first_name || ''} ${m.member?.last_name || ''}`.trim() || m.member?.email || m.email || '',
            email: m.member?.email || m.email || '',
          }))
          .filter(m => m.name);
        availableStates = states.map((s: any) => ({ id: s.id, name: s.name, group: s.group }));
      } catch (ctxErr) {
        console.warn('Failed to fetch members/states context for batch creation:', ctxErr);
      }
    }

    const conversationContext = {
      activeProjectId: projectId,
      activeProjectKey: projectId,
      availableProjects,
      availableMembers,
      availableStates,
    };

    const intentResult = await parseIntentAsync(enrichedMessage, conversationContext, chatHistory);

    if (!intentResult.entities.projectKey && projectId) {
      intentResult.entities.projectKey = projectId;
    }

    const tier = classifyIntentTier(intentResult.intent);

    // Build plan asynchronously (supports decomposition, batch metadata enrichment & duplicate checks)
    const plan = await buildActionPlanFromIntentAsync(intentResult, conversationContext, enrichedMessage);

    // Calculate exact tokens (Gemini standard: ~3.8 chars/token + 258 tokens per vision image tile)
    const imageTokenCount = image?.base64Data ? 258 : 0;
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
        members: availableMembers,
        states: availableStates,
      });
    }

    // For read-only, chat, or direct query intents, execute immediately without approval
    const actionCards = await executeIntent(intentResult, planeService, {
      userScope: intentResult.entities.userScope || userScope || 'my_tasks',
      currentUserId: currentUser?.userId,
    });

    let reply = intentResult.entities.chatReply;
    if (!reply) {
      if (intentResult.intent === 'list_issues') {
        const projName = intentResult.entities.projectKey && intentResult.entities.projectKey !== 'ALL'
          ? intentResult.entities.projectKey
          : 'workspace';
        reply = `Berikut adalah daftar task untuk **${projName}**:`;
      } else if (intentResult.intent === 'list_projects') {
        reply = 'Berikut adalah daftar project di workspace Plane Anda:';
      } else if (intentResult.intent === 'get_issue') {
        reply = `Detail task **${intentResult.entities.issueKey}**:`;
      } else if (intentResult.intent === 'help') {
        reply = 'Saya dapat membantu Anda mengelola project dan task di Plane. Perintah yang bisa Anda coba:\n- *"Tampilkan tugasku"*\n- *"List task di project BSJ Phase 4"*\n- *"Pecah feature payment gateway menjadi subtask"*\n- *"Pindahkan task BSJ-12 ke Done"*';
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
