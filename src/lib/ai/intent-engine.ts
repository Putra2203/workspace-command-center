import { IntentResult, ConversationContext, ActionPlan, ActionStep } from '@/types/ai';
import { ActionPlanSchema } from '@/types/schemas';
import { classifyIntentTier, selectModelForTier } from './router';
import { decomposeFeatureToSubtasks } from './decomposition';

/**
 * Parses user input to determine the intent and extract relevant entities.
 * Supports Plane commands, bulk task creation, decomposition, and Gemini LLM conversational chat.
 */
export async function parseIntentAsync(message: string, context?: ConversationContext): IntentResultAsync {
  const trimmed = message.trim();
  const lowerMsg = trimmed.toLowerCase();
  
  // Strict check for pure greeting (ONLY when no command follows)
  const isPureGreeting = /^(hai|halo|hi|hey|hello|p|tes|test|assalamu['a]?laikum|selamat pagi|selamat siang|selamat malam)\s*[!.]*$/i.test(lowerMsg);

  // 1. First Tier: L0 Deterministic Parser (0 Tokens)
  const deterministicResult = parseIntent(message, context);
  if (deterministicResult.intent !== 'unknown' && deterministicResult.confidence >= 0.8) {
    return deterministicResult;
  }

  // 2. Pure standalone greeting handler
  if (isPureGreeting) {
    return {
      intent: 'chat',
      entities: {
        chatReply: 'Halo! 👋 Saya **Erdavid Work OS — Mission Control AI**.\n\nSaya siap membantu mengelola project Plane Anda secara otomatis. Beberapa perintah yang bisa Anda gunakan:\n- 📋 *"Tampilkan tugasku"* / *"List task di project BSJ Phase 4"*\n- ⚡ *"Tugas yang urgent apa aja?"*\n- ➕ *"Buat task implementasi bank transfer"*\n- 🧩 *"Pecah feature payment gateway menjadi subtask"*\n- 🔄 *"Pindahkan task BSJ-12 ke Done"*',
      },
      confidence: 0.95,
    };
  }

  // 3. Second Tier: Gemini 2.5 Model (When deterministic rules are ambiguous)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const tier = classifyIntentTier(deterministicResult.intent);
      const model = selectModelForTier(tier);

      const projectsList = context?.availableProjects
        ? context.availableProjects.map(p => `${p.identifier}: "${p.name}" (id: ${p.id})`).join(', ')
        : 'None specified';

      const response = await ai.models.generateContent({
        model,
        contents: `You are an AI intent parser for Erdavid Work OS (Plane Project Management).
Analyze the user prompt and return structured JSON with intent and extracted entities.

Valid intents: "list_projects", "list_issues", "create_issue", "batch_create_issues", "decompose", "plan", "get_issue", "update_issue", "help", "chat", "unknown".

Context:
- Active Project: "${context?.activeProjectKey || context?.activeProjectId || 'ALL'}"
- Available Workspace Projects: [${projectsList}]

Instructions:
1. If the user asks for their tasks ("tugasku", "tugas saya", "my tasks"), return intent "list_issues" with userScope "my_tasks".
2. If the user asks to list/show tasks in a project ("list task di BSJ Phase 4"), resolve projectKey to the project identifier (e.g. "BSJ") or exact name.
3. For batch task creation (multi-line or numbered list): return "batch_create_issues" with array of tasks.
4. For feature breakdown / planning: return "decompose" with title.
5. For task status/priority change: return "update_issue" with issueKey and target state/priority.
6. For conversational queries/advice: return "chat" with a helpful chatReply.

Output JSON format:
{
  "intent": "list_issues|create_issue|batch_create_issues|decompose|update_issue|get_issue|list_projects|chat|unknown",
  "entities": {
    "projectKey": "...",
    "issueKey": "...",
    "title": "...",
    "description": "...",
    "priority": "urgent|high|medium|low|none",
    "state": "...",
    "userScope": "my_tasks|all",
    "tasks": [{ "title": "...", "description": "...", "priority": "..." }],
    "chatReply": "..."
  },
  "confidence": 0.95
}

User Prompt: "${message}"`,
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
            confidence: parsed.confidence || 0.95,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini LLM Intent Parser Fallback to L0 Engine:', err);
    }
  }

  // 4. Fallback when LLM is unavailable
  if (deterministicResult.intent === 'unknown') {
    return {
      intent: 'chat',
      entities: {
        chatReply: 'Halo! 👋 Saya **Erdavid Work OS AI**.\n\nSaya bisa membantu Anda mengelola project Plane secara otomatis. Contoh perintah:\n- *"Tampilkan tugasku"*\n- *"List task di project BSJ Phase 4"*\n- *"Buat task fix login bug"*\n- *"Pecah feature payment gateway menjadi subtask"*\n- *"Pindahkan task BSJ-12 ke Done"*',
      },
      confidence: 0.8,
    };
  }

  return deterministicResult;
}

type IntentResultAsync = Promise<IntentResult>;

/**
 * Robust L0 Deterministic Parser (0 Tokens).
 * Accurately parses natural Indonesian and English project management commands.
 */
export function parseIntent(message: string, context?: ConversationContext): IntentResult {
  const trimmed = message.trim();
  const lowerMessage = trimmed.toLowerCase();
  
  const result: IntentResult = {
    intent: 'unknown',
    entities: {},
    confidence: 0,
  };

  // 1. Check for Help prompt
  if (/^(help|bantuan|cara pakai|what can you do|menu bantuan)\b/i.test(lowerMessage)) {
    result.intent = 'help';
    result.confidence = 0.95;
    return result;
  }

  // 2. Resolve Issue Sequence Key (e.g. BSJ-124, PROJECT1-31, BSJ-4)
  const issueMatch = message.match(/\b([A-Z0-9]+-\d+)\b/i);
  if (issueMatch) {
    result.entities.issueKey = issueMatch[1].toUpperCase();
    result.entities.projectKey = issueMatch[1].split('-')[0].toUpperCase();
  }

  // 3. Resolve Project Key from prompt or active context
  let extractedProject: string | undefined;

  if (context?.availableProjects && context.availableProjects.length > 0) {
    for (const proj of context.availableProjects) {
      const projNameLower = proj.name.toLowerCase();
      const projIdLower = proj.identifier.toLowerCase();
      if (lowerMessage.includes(projNameLower) || lowerMessage.includes(projIdLower)) {
        extractedProject = proj.identifier || proj.id;
        break;
      }
    }
  }

  if (!extractedProject) {
    const trailingProjMatch = message.match(/(?:di|ke|in|for)\s+(?:project\s+)?([A-Z0-9]{2,12})\b/i);
    if (trailingProjMatch && !trailingProjMatch[1].includes('-')) {
      const candidate = trailingProjMatch[1].toUpperCase();
      if (!['TASK', 'TODO', 'DONE', 'ISSUE', 'PLAN'].includes(candidate)) {
        extractedProject = candidate;
      }
    }
  }

  if (!extractedProject && !result.entities.projectKey) {
    const projectMatch = message.match(/\b([A-Z0-9]{2,12})\b/);
    if (projectMatch && !projectMatch[1].includes('-') && !['TASK', 'TODO', 'DONE', 'ISSUE', 'PLAN'].includes(projectMatch[1].toUpperCase())) {
      extractedProject = projectMatch[1];
    } else if (context?.activeProjectKey && context.activeProjectKey !== 'ALL') {
      extractedProject = context.activeProjectKey;
    } else if (context?.activeProjectId && context.activeProjectId !== 'ALL') {
      extractedProject = context.activeProjectId;
    }
  }

  if (extractedProject) {
    result.entities.projectKey = extractedProject;
  }

  // 4. Resolve Priority
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

  // 5. Resolve State Normalization (Indonesian & English)
  const statesMapping: Record<string, string> = {
    'selesai': 'done',
    'beres': 'done',
    'kelar': 'done',
    'done': 'done',
    'completed': 'done',
    'sedang jalan': 'in progress',
    'sedang berjalan': 'in progress',
    'on progress': 'in progress',
    'in progress': 'in progress',
    'wip': 'in progress',
    'started': 'in progress',
    'todo': 'unstarted',
    'belum dimulai': 'unstarted',
    'unstarted': 'unstarted',
    'backlog': 'backlog',
    'tunda': 'backlog',
    'cancelled': 'cancelled',
    'batal': 'cancelled',
  };

  for (const [statePhrase, normalizedState] of Object.entries(statesMapping)) {
    if (lowerMessage.includes(statePhrase)) {
      result.entities.state = normalizedState;
      break;
    }
  }

  // 6. Detect User Scope ("tugasku", "tugas saya", "task ku", "my tasks")
  const isMyTasks = /\b(tugasku|task\s*ku|tugas\s*saya|tugas\s*ku|my\s*tasks?|my\s*issues?|pekerjaanku)\b/i.test(lowerMessage);
  if (isMyTasks) {
    result.entities.userScope = 'my_tasks';
    result.entities.filter = 'my_tasks';
  }

  // 7. Check for Decomposition / Planning prompt
  const isDecomposePrompt = /pecah|decompose|break down|bagikan|rencanakan|plan (?:sprint|feature)?/i.test(lowerMessage);
  if (isDecomposePrompt) {
    const titleMatch = message.replace(/^.*?(?:pecah|decompose|break down|rencanakan|plan)\s+(?:feature|sprint|task|modul)?\s*(?:yaitu|berikut|:)?\s*/i, '');
    result.intent = 'decompose';
    result.entities.title = titleMatch.trim() || message;
    result.confidence = 0.9;
    return result;
  }

  // 8. Check for Issue Listing Prompts ("tampilkan tugasku", "list task ku di project bsj phase 4", "ada task apa aja", etc.)
  const isListIssuesPrompt = /^(tampilkan|list|lihat|show|cek|ada\s+task|daftar\s+task|daftar\s+issue|daftar\s+tiket|tugas\s+saya|tugasku|task\s*ku)\b/i.test(lowerMessage) ||
    /\b(list (?:all )?(?:issues|tasks|tickets)|tampilkan (?:semua )?(?:issue|task|tiket|tugas)|show (?:my )?(?:issues|tasks|tickets))\b/i.test(lowerMessage);

  if (isListIssuesPrompt && !/^(daftar\s+project|list\s+projects|tampilkan\s+project)/i.test(lowerMessage)) {
    result.intent = 'list_issues';
    if (!result.entities.projectKey) {
      result.entities.projectKey = context?.activeProjectKey || context?.activeProjectId || 'ALL';
    }
    result.confidence = 0.95;
    return result;
  }

  // 9. Check for Projects Listing Prompts ("daftar project", "list projects", "tampilkan semua project")
  const isListProjectsPrompt = /^(daftar\s+project|list\s+projects?|tampilkan\s+(?:semua\s+)?projects?|ada\s+project\s+apa|show\s+projects?)\b/i.test(lowerMessage);
  if (isListProjectsPrompt) {
    result.intent = 'list_projects';
    result.confidence = 0.95;
    return result;
  }

  // 10. Check for Task Creation / Bulk Creation Prompt
  const isCreationPrompt = /^(buat|create|masukin|tambah|input|new task|new issue|tambahkan)\b/i.test(lowerMessage) || /^\s*\d+[\.\)]\s*.+?:/m.test(message);
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

    const colonIdx = message.indexOf(':');
    if (colonIdx > -1) {
      const afterColon = message.slice(colonIdx + 1).trim();
      const listItems = afterColon
        .split(/(?:\r?\n|\b\d+[\.\)]\s*|[\-\•]\s*)/)
        .map(s => s.trim())
        .filter(s => s.length > 2 && !/^(buat|create|masukin|tambah|input|task|issue|ke project|di project)/i.test(s));

      if (listItems.length >= 2) {
        result.intent = 'batch_create_issues';
        result.entities.titles = listItems;
        result.entities.tasks = listItems.map(item => ({ title: item }));
        result.confidence = 0.9;
        return result;
      }
    }

    let afterActionText = message.replace(/^.*?(?:buat|create|masukin|tambah|input|tambahkan)\s+(?:(?:\d+\s+)?(?:task|issue|tiket|tugas)s?)?\s*/i, '');
    
    // Extract trailing "di PROJECT" or "ke PROJECT"
    const trailingProjMatch = afterActionText.match(/\s+(?:di|ke|in|for)\s+(?:project\s+)?([A-Z0-9_-]+)\s*$/i);
    if (trailingProjMatch) {
      result.entities.projectKey = trailingProjMatch[1].toUpperCase();
      afterActionText = afterActionText.slice(0, trailingProjMatch.index).trim();
    }

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
      const innerColon = afterActionText.indexOf(':');
      if (innerColon > -1) {
        result.entities.title = afterActionText.slice(0, innerColon).trim();
        result.entities.description = afterActionText.slice(innerColon + 1).trim();
      } else {
        result.entities.title = afterActionText.trim();
      }
      result.confidence = 0.9;
      return result;
    }
  }

  // 11. Check for Update Issue Prompt ("pindahkan BSJ-1 ke Done", "ubah priority BSJ-4 jadi urgent")
  const isUpdatePrompt = /^(pindahkan|move|update|ubah|ganti|assign|set)\b/i.test(lowerMessage) || /\b(pindahkan ke|ubah status|ganti priority|assign ke)\b/i.test(lowerMessage);
  if (isUpdatePrompt && result.entities.issueKey) {
    result.intent = 'update_issue';
    result.confidence = 0.9;
    return result;
  }

  // 12. Check for Get Issue Details Prompt ("detail BSJ-12", "cek tiket BSJ-4")
  const isGetPrompt = /^(detail|cek|lihat detail|ambil|get)\b/i.test(lowerMessage);
  if (isGetPrompt && result.entities.issueKey) {
    result.intent = 'get_issue';
    result.confidence = 0.9;
    return result;
  }

  // 13. Fallback when issueKey is present
  if (result.entities.issueKey) {
    if (result.entities.state || /ubah|ganti|pindah|update|set/i.test(lowerMessage)) {
      result.intent = 'update_issue';
      result.confidence = 0.8;
    } else {
      result.intent = 'get_issue';
      result.confidence = 0.7;
    }
    return result;
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
