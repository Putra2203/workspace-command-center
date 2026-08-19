import { NextRequest } from 'next/server';
import { parseIntentAsync } from '@/lib/ai/intent-engine';
import { executeIntent } from '@/lib/ai/executor';
import { PlaneService } from '@/lib/plane/client';
import { getCurrentUserContext } from '@/lib/context/current-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, projectId, conversationHistory, userScope } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const context = {
      activeProjectId: projectId,
    };

    // 1. Parse Intent (supports Gemini LLM & Multi-Task Smart Parser)
    const intentResult = await parseIntentAsync(message, context);

    // Provide default project from context if not explicitly mentioned in the message
    if (!intentResult.entities.projectKey && context.activeProjectId) {
      intentResult.entities.projectKey = context.activeProjectId;
    }

    // 2. Resolve current-user identity server-side (never trust a client-supplied
    // user id for "my tasks" filtering) and execute the intent against Plane API
    const planeService = new PlaneService();
    let currentUserId: string | undefined;
    try {
      currentUserId = (await getCurrentUserContext(planeService)).userId;
    } catch (err: any) {
      console.error('Failed to resolve current user from Plane API:', err.message);
      // Fail closed on identity, not on the whole request: proceed without a
      // resolved user id so read-only/non-"my_tasks" intents still work.
    }

    const actionCards = await executeIntent(intentResult, planeService, {
      userScope: userScope || 'my_tasks',
      currentUserId,
    });

    // Generate text reply based on intent
    let reply = `I've processed your request.`;
    if (intentResult.intent === 'chat' && intentResult.entities.chatReply) {
      reply = intentResult.entities.chatReply;
    } else if (intentResult.intent === 'batch_create_issues') {
      reply = `Successfully created ${intentResult.entities.titles?.length || 0} tasks in parallel.`;
    } else if (intentResult.intent === 'unknown') {
      reply = `I didn't quite catch that command. Try asking to create tasks, list issues, or move an issue.`;
    } else {
      reply = `Here are the results for ${intentResult.intent.replace('_', ' ')}.`;
    }

    return Response.json({
      reply,
      actionCards,
    });
  } catch (error: any) {
    console.error('AI API Error:', error.message);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
