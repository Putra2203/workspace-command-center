import { IntentResult, ConversationContext, ActionPlan, ActionStep } from '@/types/ai';
import { ActionPlanSchema } from '@/types/schemas';
import { classifyIntentTier, selectModelForTier } from './router';
import { decomposeFeatureToSubtasks } from './decomposition';

/**
 * Parses user input to determine the intent and extract relevant entities.
 * Supports Plane commands, bulk task creation, decomposition, and Gemini LLM conversational chat.
 */
export async function parseIntentAsync(message: string, context?: ConversationContext): IntentResultAsync {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const lowerMsg = message.trim().toLowerCase();
  const isGreeting = /^(hai|halo|hi|hey|hello|p|tes|test|apa kabar|siapa kamu|siapa anda|selamat pagi|selamat siang|selamat malam)\b/i.test(lowerMsg);

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const intentCheck = parseIntent(message, context);
      const tier = classifyIntentTier(intentCheck.intent);
      const model = selectModelForTier(tier);

      if (isGreeting || intentCheck.intent === 'unknown' || intentCheck.intent === 'chat' || intentCheck.intent === 'help') {
        const chatResponse = await ai.models.generateContent({
          model,
          contents: `You are Plane AI Command Center, an intelligent assistant for project management.
Respond to the user naturally, warmly, and helpfully in Indonesian (or the language of their prompt).
If they say hello or ask a question, greet them and briefly explain that you can manage Plane tasks (list tasks, create tasks, update issue status, bulk tasks, decompose features).

User message: "${message}"`,
        });

        const text = typeof (chatResponse as any).text === 'function' ? (chatResponse as any).text() : (chatResponse as any).text;
        return {
          intent: 'chat',
          entities: { chatReply: text || 'Halo! Saya Plane AI Command Center. Ada yang bisa saya bantu dengan project Anda?' },
          confidence: 0.95,
        };
      }

      const response = await ai.models.generateContent({
        model,
        contents: `You are an AI intent parser for Plane Project Management. Analyze the user prompt and return JSON with intent and entities.
Valid intents: "list_projects", "list_issues", "create_issue", "batch_create_issues", "decompose", "plan", "get_issue", "update_issue", "help", "chat", "unknown".

For batch task creation (when user provides multiple tasks, list of tasks, format like "1. Title : Description" or multi-line tasks):
Return intent "batch_create_issues" with entities:
{
  "tasks": [
    { "title": "Task Title 1", "description": "Task Description 1", "priority": "high|medium|low" },
    { "title": "Task Title 2", "description": "Task Description 2" }
  ],
  "projectKey": "..." // if mentioned
}

For single task creation:
Return intent "create_issue" with entities:
{
  "title": "...",
  "description": "...",
  "priority": "...",
  "projectKey": "..."
}

User Prompt: "${message}"
Active Project Context: "${context?.activeProjectKey || ''}"`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed && parsed.intent) {
          return {
            intent: parsed.intent,
            entities: parsed.entities || {},
            confidence: 0.95,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini LLM Intent Parser Fallback to Smart Engine:', err);
    }
  }

  const fallbackResult = parseIntent(message, context);
  if (isGreeting || fallbackResult.intent === 'unknown') {
    return {
      intent: 'chat',
      entities: {
        chatReply: 'Halo! 👋 Saya **Plane AI Command Center**.\n\nSaya bisa membantu Anda mengelola project Plane secara otomatis. Contoh perintah:\n- *"Tampilkan task PROJECT1"*\n- *"Buat task fix login bug"*\n- *"Pecah feature User Authentication menjadi subtask"*\n- *"Pindahkan task PROJECT1-31 ke Done"*\n- *"Masukin 3 task: 1. Fix bug 2. Update UI 3. Test API"*',
      },
      confidence: 0.9,
    };
  }

  return fallbackResult;
}

type IntentResultAsync = Promise<IntentResult>;

export function parseIntent(message: string, context?: ConversationContext): IntentResult {
  const lowerMessage = message.toLowerCase();
  
  const result: IntentResult = {
    intent: 'unknown',
    entities: {},
    confidence: 0,
  };

  const projectMatch = message.match(/\b([A-Z0-9]{2,12})\b/);
  if (projectMatch && !projectMatch[1].includes('-')) {
    result.entities.projectKey = projectMatch[1];
  } else if (context?.activeProjectKey) {
    result.entities.projectKey = context.activeProjectKey;
  }

  const issueMatch = message.match(/\b([A-Z0-9]+-\d+)\b/i);
  if (issueMatch) {
    result.entities.issueKey = issueMatch[1].toUpperCase();
  }

  const priorities = ['urgent', 'high', 'medium', 'low', 'none', 'tinggi', 'rendah', 'sedang'];
  for (const prio of priorities) {
    if (lowerMessage.includes(prio)) {
      if (prio === 'tinggi') result.entities.priority = 'high';
      else if (prio === 'sedang') result.entities.priority = 'medium';
      else if (prio === 'rendah') result.entities.priority = 'low';
      else result.entities.priority = prio;
      break;
    }
  }

  const states = ['done', 'in progress', 'todo', 'backlog', 'cancelled', 'selesai', 'sedang berjalan'];
  for (const state of states) {
    if (lowerMessage.includes(state)) {
      result.entities.state = state === 'selesai' ? 'done' : state === 'sedang berjalan' ? 'in progress' : state;
      break;
    }
  }

  // Check for Decomposition / Planning prompt
  const isDecomposePrompt = /pecah|decompose|break down|bagikan|rencanakan|plan (?:sprint|feature)?/i.test(lowerMessage);
  if (isDecomposePrompt) {
    const titleMatch = message.replace(/^.*?(?:pecah|decompose|break down|rencanakan|plan)\s+(?:feature|sprint|task)?\s*(?:yaitu|berikut|:)?\s*/i, '');
    result.intent = 'decompose';
    result.entities.title = titleMatch.trim() || message;
    result.confidence = 0.85;
    return result;
  }

  const isCreationPrompt = /buat|create|masukin|tambah|input|new task|new issue/i.test(lowerMessage) || /^\s*\d+[\.\)]\s*.+?:/m.test(message);
  if (isCreationPrompt) {
    // Check for structured multi-line list with "1. Title : Description" format
    const lines = message.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const structuredTasks: { title: string; description?: string }[] = [];

    for (const line of lines) {
      const match = line.match(/^(?:\d+[\.\)]|\-|\*)\s*([^:]+?)(?:\s*:\s*(.+))?$/);
      if (match && match[1] && match[1].length > 1) {
        structuredTasks.push({
          title: match[1].trim(),
          description: match[2]?.trim(),
        });
      }
    }

    if (structuredTasks.length >= 2) {
      result.intent = 'batch_create_issues';
      result.entities.tasks = structuredTasks;
      result.entities.titles = structuredTasks.map(t => t.title);
      result.confidence = 0.95;
      return result;
    }

    const listItems = message
      .split(/(?:\r?\n|\b\d+[\.\)]\s*|[\-\•]\s*)/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && !/^(buat|create|masukin|tambah|input|task|issue|ke project|di project)/i.test(s));

    if (listItems.length >= 2) {
      result.intent = 'batch_create_issues';
      result.entities.titles = listItems;
      result.entities.tasks = listItems.map(item => {
        const colonIdx = item.indexOf(':');
        if (colonIdx > -1) {
          return {
            title: item.slice(0, colonIdx).trim(),
            description: item.slice(colonIdx + 1).trim(),
          };
        }
        return { title: item };
      });
      result.confidence = 0.9;
      return result;
    }

    const afterActionText = message.replace(/^.*?(?:buat|create|masukin|tambah|input)\s+(?:task|issue|tiket)?\s*(?:di|ke)?\s*(?:project)?\s*[A-Z0-9]*\s*(?:yaitu|berikut|:)?\s*/i, '');
    const parts = afterActionText.split(/,|\bdan\b|\blalu\b|\bserta\b/i).map(s => s.trim()).filter(s => s.length > 2);
    if (parts.length >= 2) {
      result.intent = 'batch_create_issues';
      result.entities.titles = parts;
      result.entities.tasks = parts.map(t => ({ title: t }));
      result.confidence = 0.85;
      return result;
    }

    if (afterActionText.trim().length > 0) {
      result.intent = 'create_issue';
      const colonIdx = afterActionText.indexOf(':');
      if (colonIdx > -1) {
        result.entities.title = afterActionText.slice(0, colonIdx).trim();
        result.entities.description = afterActionText.slice(colonIdx + 1).trim();
      } else {
        result.entities.title = afterActionText.trim();
      }
      result.confidence = 0.8;
      return result;
    }
  }

  const patterns = {
    list_issues: /list (?:all )?(?:issues|tasks|tickets)|tampilkan (?:semua )?(?:issue|task|tiket)|show (?:my )?(?:issues|tasks)|tugas saya|daftar task/i,
    create_issue: /create (?:an )?(?:issue|task|ticket)|buat (?:sebuah )?(?:issue|task|tiket|tugas)|new (?:issue|task)/i,
    update_issue: /update (?:issue|task)|perbarui (?:issue|task)|pindahkan ke|assign ke|ubah status/i,
    get_issue: /get (?:issue|task)|ambil (?:issue|task)|tampilkan detail (?:issue|task)/i,
    list_projects: /list projects|tampilkan (?:semua )?proyek|daftar proyek|list project/i,
    help: /help|bantuan|cara pakai|what can you do/i,
  };

  let highestConfidence = 0;
  for (const [intentName, regex] of Object.entries(patterns)) {
    if (regex.test(message)) {
      const matchLength = message.match(regex)?.[0].length || 0;
      const confidence = matchLength / message.length;
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        result.intent = intentName as IntentResult['intent'];
        result.confidence = Math.min(0.9, confidence + 0.4);
      }
    }
  }

  if (result.intent === 'unknown') {
    if (result.entities.issueKey && lowerMessage.includes('status')) {
      result.intent = 'update_issue';
      result.confidence = 0.7;
    } else if (result.entities.issueKey) {
      result.intent = 'get_issue';
      result.confidence = 0.6;
    } else if (result.entities.state || result.entities.priority || result.entities.filter) {
      result.intent = 'list_issues';
      result.confidence = 0.6;
    }
  }

  return result;
}

/**
 * Builds an ActionPlan for mutating intents so that changes can be previewed
 * and explicitly approved before modifying workspace data.
 */
export async function buildActionPlanFromIntentAsync(
  intentResult: IntentResult,
  context?: ConversationContext
): Promise<ActionPlan | null> {
  const targetProject = intentResult.entities.projectKey || context?.activeProjectKey || 'PROJECT';
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (intentResult.intent === 'decompose' || intentResult.intent === 'plan') {
    const promptText = intentResult.entities.title || 'Feature';
    const subtasks = await decomposeFeatureToSubtasks(promptText, targetProject);

    const steps: ActionStep[] = subtasks.map(st => ({
      operation: 'createIssue',
      target: targetProject,
      changes: { title: st.title, priority: st.priority || 'medium' },
    }));

    const plan: ActionPlan = {
      id: planId,
      intent: intentResult.intent,
      summary: `Dekomposisi "${promptText}" menjadi ${subtasks.length} subtask di project ${targetProject}`,
      risk: 'medium',
      requiresApproval: true,
      steps,
    };

    const validated = ActionPlanSchema.safeParse(plan);
    return validated.success ? validated.data : null;
  }

  return buildActionPlanFromIntent(intentResult, context);
}

export function buildActionPlanFromIntent(
  intentResult: IntentResult,
  context?: ConversationContext
): ActionPlan | null {
  const targetProject = intentResult.entities.projectKey || context?.activeProjectKey || 'PROJECT';
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (intentResult.intent === 'create_issue') {
    const title = intentResult.entities.title || 'New Task';
    const changes: Record<string, unknown> = { title };
    if (intentResult.entities.description) changes.description = intentResult.entities.description;
    if (intentResult.entities.priority) changes.priority = intentResult.entities.priority;
    if (intentResult.entities.state) changes.state = intentResult.entities.state;

    const plan: ActionPlan = {
      id: planId,
      intent: 'create_issue',
      summary: `Buat task "${title}" di project ${targetProject}`,
      risk: 'low',
      requiresApproval: true,
      steps: [
        {
          operation: 'createIssue',
          target: targetProject,
          changes,
        },
      ],
    };

    const validated = ActionPlanSchema.safeParse(plan);
    return validated.success ? validated.data : null;
  }

  if (intentResult.intent === 'batch_create_issues') {
    const tasks: { title: string; description?: string; priority?: string }[] =
      intentResult.entities.tasks || (intentResult.entities.titles || []).map(t => ({ title: t }));
    const steps: ActionStep[] = tasks.map(t => ({
      operation: 'createIssue',
      target: targetProject,
      changes: {
        title: t.title,
        ...(t.description ? { description: t.description } : {}),
        ...(t.priority ? { priority: t.priority } : {}),
      },
    }));

    const plan: ActionPlan = {
      id: planId,
      intent: 'batch_create_issues',
      summary: `Buat ${tasks.length} task sekaligus di project ${targetProject}`,
      risk: 'medium',
      requiresApproval: true,
      steps,
    };

    const validated = ActionPlanSchema.safeParse(plan);
    return validated.success ? validated.data : null;
  }

  if (intentResult.intent === 'update_issue') {
    const targetIssue = intentResult.entities.issueKey || 'ISSUE';
    const changes: Record<string, unknown> = {};
    if (intentResult.entities.priority) changes.priority = intentResult.entities.priority;
    if (intentResult.entities.state) changes.state = intentResult.entities.state;

    const plan: ActionPlan = {
      id: planId,
      intent: 'update_issue',
      summary: `Perbarui task ${targetIssue}${changes.state ? ` -> ${changes.state}` : ''}${changes.priority ? ` (${changes.priority} priority)` : ''}`,
      risk: 'low',
      requiresApproval: true,
      steps: [
        {
          operation: 'updateIssue',
          target: targetIssue,
          changes,
        },
      ],
    };

    const validated = ActionPlanSchema.safeParse(plan);
    return validated.success ? validated.data : null;
  }

  return null;
}
