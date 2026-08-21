import { IntentResult, ConversationContext, ActionPlan, ActionStep } from '@/types/ai';
import type { FunctionDeclaration } from '@google/genai';
import { ActionPlanSchema } from '@/types/schemas';
import { classifyIntentTier, selectModelForTier } from './router';
import { decomposeFeatureToSubtasks } from './decomposition';

export type ChatHistoryTurn = { role: 'user' | 'assistant'; content: string };

const KNOWN_INTENT_NAMES = [
  'list_projects', 'list_issues', 'create_issue', 'batch_create_issues',
  'decompose', 'update_issue', 'get_issue', 'help', 'chat',
] as const;

/**
 * Calls Gemini with native function-calling (one function declaration per intent) instead of
 * a free-text "return JSON" prompt — the model is constrained to emit a structured, schema-valid
 * function call, which removes the JSON.parse-fails-on-malformed-output failure class entirely
 * and makes adding a new intent a matter of adding one declaration rather than four disconnected edits.
 *
 * `history` (recent prior turns of the same chat session) is passed as multi-turn `contents` purely
 * so the model can resolve references ("-nya", "task itu", a previously mentioned issue) — it is always
 * asked to classify only the CURRENT (last) message.
 */
async function parseIntentViaLLM(
  message: string,
  context: ConversationContext | undefined,
  history: ChatHistoryTurn[],
  model: string
): Promise<IntentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI, Type, FunctionCallingConfigMode } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const projectsList = context?.availableProjects?.length
      ? context.availableProjects.map(p => `${p.identifier}: "${p.name}" (id: ${p.id})`).join(', ')
      : 'None specified';
    const priorityEnum = ['urgent', 'high', 'medium', 'low', 'none'];

    const taskItemSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Concise task title.' },
        description: { type: Type.STRING },
        priority: { type: Type.STRING, enum: priorityEnum },
      },
      required: ['title'],
    };

    const functionDeclarations: FunctionDeclaration[] = [
      {
        name: 'list_projects',
        description: 'List all projects in the workspace.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'list_issues',
        description: 'List/show issues or tasks, optionally filtered by project, priority, status, or assignment scope.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectKey: { type: Type.STRING, description: 'Project identifier or name mentioned by the user.' },
            userScope: { type: Type.STRING, enum: ['my_tasks', 'all'] },
            priority: { type: Type.STRING, enum: priorityEnum },
            state: { type: Type.STRING, description: 'Status name mentioned, e.g. "Done", "In Progress".' },
          },
        },
      },
      {
        name: 'create_issue',
        description: 'Create a single new issue/task.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: priorityEnum },
            projectKey: { type: Type.STRING },
            state: { type: Type.STRING },
            parentIssueKey: {
              type: Type.STRING,
              description: 'Set ONLY if the user explicitly wants this created as a sub-item/child of an existing issue key.',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'batch_create_issues',
        description: 'Create multiple new issues/tasks at once from a list the user provided.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectKey: { type: Type.STRING },
            parentIssueKey: {
              type: Type.STRING,
              description: 'Set ONLY if the user explicitly wants these created as sub-items/children of an existing issue key.',
            },
            tasks: { type: Type.ARRAY, items: taskItemSchema },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'decompose',
        description: 'Break down / decompose a feature or epic into subtasks using AI judgement — use this when the user asks the assistant to figure out the subtasks itself, not when they already listed the items (that is batch_create_issues).',
        parameters: {
          type: Type.OBJECT,
          properties: { title: { type: Type.STRING }, projectKey: { type: Type.STRING } },
          required: ['title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update the status/priority of an existing issue.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            issueKey: { type: Type.STRING },
            state: { type: Type.STRING },
            priority: { type: Type.STRING, enum: priorityEnum },
          },
          required: ['issueKey'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get/show details of one specific existing issue.',
        parameters: { type: Type.OBJECT, properties: { issueKey: { type: Type.STRING } }, required: ['issueKey'] },
      },
      {
        name: 'help',
        description: 'The user is asking what the assistant can do.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'chat',
        description: 'General conversation, questions, or advice that is not a project-management command.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            chatReply: { type: Type.STRING, description: 'A helpful reply to the user, written in the same language they used.' },
          },
          required: ['chatReply'],
        },
      },
    ];

    const contents = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: `You are the intent classifier for Erdavid Work OS (Plane project management).
Active project: "${context?.activeProjectKey || context?.activeProjectId || 'ALL'}"
Available workspace projects: [${projectsList}]
The conversation history is provided ONLY so you can resolve references such as "-nya", "task itu", "that one", or a previously mentioned issue/project. Always classify the intent of the CURRENT (most recent) user message — never re-classify an earlier turn. Always respond by calling exactly one function.`,
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
      },
    });

    const call = response.functionCalls?.[0];
    if (!call?.name || !(KNOWN_INTENT_NAMES as readonly string[]).includes(call.name)) {
      return null;
    }

    return {
      intent: call.name as IntentResult['intent'],
      entities: (call.args as IntentResult['entities']) || {},
      confidence: 0.95,
    };
  } catch (err) {
    console.warn('Gemini function-calling intent parser failed, falling back to L0 engine:', err);
    return null;
  }
}

/**
 * Parses user input to determine the intent and extract relevant entities.
 * Supports Plane commands, bulk task creation, decomposition, and Gemini LLM conversational chat.
 */
export async function parseIntentAsync(
  message: string,
  context?: ConversationContext,
  history: ChatHistoryTurn[] = []
): IntentResultAsync {
  const trimmed = message.trim();
  const lowerMsg = trimmed.toLowerCase();

  // Strict check for pure greeting (ONLY when no command follows)
  const isPureGreeting = /^(hai|halo|hi|hey|hello|p|tes|test|assalamu['a]?laikum|selamat pagi|selamat siang|selamat malam)\s*[!.]*$/i.test(lowerMsg);

  // 1. First Tier: L0 Deterministic Parser (0 Tokens) — kept as a fast, free path for
  // unambiguous commands so cheap/common cases never pay for an LLM round-trip.
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

  // 3. Second Tier: Gemini function-calling (when deterministic rules are ambiguous),
  // with recent chat history attached so multi-turn follow-ups resolve correctly.
  const tier = classifyIntentTier(deterministicResult.intent);
  const model = selectModelForTier(tier);
  const llmResult = await parseIntentViaLLM(message, context, history, model);
  if (llmResult) {
    return llmResult;
  }

  // 4. Fallback when LLM is unavailable or fails
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

  // 6.5. Check for Sub-item / Sub-task Creation ("tambahkan sub-task ke BSJ-12: ...")
  // Must run before the generic creation check (10) and the issueKey fallback (13),
  // since a bare issueKey there would otherwise be read as an update/get target
  // instead of the parent for a newly created child issue.
  // "pecah/decompose ... jadi subtask" is intentionally excluded here — that phrasing
  // means "AI, figure out the subtasks yourself" and belongs to the smart decompose flow
  // below, not this literal "here is my explicit list of sub-items" flow.
  const subItemTriggerRegex = /\b(sub[\s-]?task|sub[\s-]?issue|sub[\s-]?item|subtask|anak\s*task|child\s*task)\b/i;
  const isDecomposeVerbPresent = /pecah|decompose|break down|bagikan|rencanakan/i.test(lowerMessage);
  if (subItemTriggerRegex.test(lowerMessage) && result.entities.issueKey && !isDecomposeVerbPresent) {
    const parentKey = result.entities.issueKey;
    const escapedParentKey = parentKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const afterParentMatch = message.match(new RegExp(`${escapedParentKey}\\s*[:\\-]?\\s*([\\s\\S]*)`, 'i'));
    const remainder = (afterParentMatch ? afterParentMatch[1] : '').trim();

    result.entities.parentIssueKey = parentKey;
    delete result.entities.issueKey;

    if (remainder.length > 0) {
      const lines = remainder.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const structuredTasks: { title: string; description?: string }[] = [];
      for (const line of lines) {
        const m = line.match(/^(?:\d+[\.\)]|\-|\*)\s*([^:]+?)(?:\s*:\s*(.+))?$/);
        if (m && m[1] && m[1].length > 1) {
          structuredTasks.push({ title: m[1].trim(), description: m[2]?.trim() });
        }
      }

      if (structuredTasks.length >= 2) {
        result.intent = 'batch_create_issues';
        result.entities.tasks = structuredTasks;
        result.entities.titles = structuredTasks.map(t => t.title);
        result.confidence = 0.92;
        return result;
      }

      const commaParts = remainder.split(/,|\bdan\b|\blalu\b|\bserta\b/i).map(s => s.trim()).filter(s => s.length > 2);
      if (commaParts.length >= 2) {
        result.intent = 'batch_create_issues';
        result.entities.titles = commaParts;
        result.entities.tasks = commaParts.map(t => ({ title: t }));
        result.confidence = 0.9;
        return result;
      }

      result.intent = 'create_issue';
      result.entities.title = remainder;
      result.confidence = 0.9;
      return result;
    }
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
 * Enriches already-extracted batch task titles/descriptions with assignee, status,
 * and due date — resolved from either a shared mention in the raw command
 * ("assign ke Dimas, status Todo, deadline besok, buat semua ini: ...") or an
 * explicit per-line override ("7. Title - assign ke Budi, deadline Jumat").
 * Falls back silently (no enrichment) when Gemini is unavailable.
 */
export async function enrichBatchTasksWithMetadata(
  tasks: { title: string; description?: string; priority?: string }[],
  rawMessage: string,
  context?: ConversationContext
): Promise<{
  tasks: { title: string; description?: string; priority?: string; assignee?: string; state?: string; dueDate?: string }[];
  missing: ('assignee' | 'state' | 'dueDate')[];
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { tasks, missing: ['assignee', 'state', 'dueDate'] };
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const membersList = context?.availableMembers?.length
      ? context.availableMembers.map(m => `"${m.name}" (${m.email})`).join(', ')
      : 'None available';
    const statesList = context?.availableStates?.length
      ? context.availableStates.map(s => `"${s.name}"`).join(', ')
      : 'Backlog, Todo, In Progress, Done, Cancelled';
    const todayIso = new Date().toISOString().slice(0, 10);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are extracting task metadata for a bulk work-item creation command in a project management tool.

Today's date: ${todayIso}
Known workspace members: [${membersList}]
Known status names: [${statesList}]

The user's raw command:
"""
${rawMessage}
"""

Already-parsed task titles (in order): ${JSON.stringify(tasks.map(t => t.title))}

For EACH task above, determine:
- "assignee": a member name from the known list if mentioned (shared for all tasks, or specific to that task's line). Omit if never mentioned anywhere.
- "state": a status name from the known list if mentioned. Omit if never mentioned anywhere.
- "dueDate": resolve any relative date mention ("besok", "minggu depan", "Jumat", "hari ini") into an absolute ISO date (YYYY-MM-DD) using today's date as reference. Omit if never mentioned anywhere.

A single shared mention (e.g. "assign semua ke Dimas, deadline besok") applies to ALL tasks unless a specific task line explicitly overrides it.
Also return "missingFields": an array listing which of "assignee", "state", "dueDate" were NOT mentioned anywhere in the command (so none of the tasks have that field).

Output ONLY JSON: { "tasks": [{ "assignee": "...", "state": "...", "dueDate": "..." }, ...], "missingFields": ["assignee", "state", "dueDate"] }
The "tasks" array must have exactly ${tasks.length} entries, in the same order as the input titles.`,
      config: { responseMimeType: 'application/json' },
    });

    const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
    if (!text) return { tasks, missing: ['assignee', 'state', 'dueDate'] };

    const parsed = JSON.parse(text);
    const metaByIndex: { assignee?: string; state?: string; dueDate?: string }[] =
      Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    const missing: ('assignee' | 'state' | 'dueDate')[] = Array.isArray(parsed?.missingFields) ? parsed.missingFields : [];

    const enriched = tasks.map((t, i) => ({
      ...t,
      assignee: metaByIndex[i]?.assignee || undefined,
      state: metaByIndex[i]?.state || undefined,
      dueDate: metaByIndex[i]?.dueDate || undefined,
    }));

    return { tasks: enriched, missing };
  } catch (err) {
    console.warn('Batch metadata enrichment fallback (assignee/state/dueDate left unset):', err);
    return { tasks, missing: ['assignee', 'state', 'dueDate'] };
  }
}

/**
 * Builds an ActionPlan for mutating intents so that changes can be previewed
 * and explicitly approved before modifying workspace data.
 */
export async function buildActionPlanFromIntentAsync(
  intentResult: IntentResult,
  context?: ConversationContext,
  rawMessage?: string
): Promise<ActionPlan | null> {
  const targetProject = intentResult.entities.projectKey || context?.activeProjectKey || 'PROJECT';
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (intentResult.intent === 'batch_create_issues') {
    const rawTasks: { title: string; description?: string; priority?: string }[] =
      intentResult.entities.tasks || (intentResult.entities.titles || []).map(t => ({ title: t }));

    const { tasks, missing } = await enrichBatchTasksWithMetadata(rawTasks, rawMessage || '', context);

    const parentKey = intentResult.entities.parentIssueKey;

    const steps: ActionStep[] = tasks.map(t => ({
      operation: 'createIssue',
      target: targetProject,
      changes: {
        title: t.title,
        ...(t.description ? { description: t.description } : {}),
        priority: t.priority || 'none',
        assignee: t.assignee || 'Unassigned',
        state: t.state || 'Backlog',
        ...(t.dueDate ? { dueDate: t.dueDate } : {}),
        ...(parentKey ? { parent: parentKey } : {}),
      },
    }));

    const missingLabels: Record<string, string> = { assignee: 'assignee', state: 'status', dueDate: 'tanggal deadline' };
    const missingNote = missing.length > 0
      ? ` ⚠️ ${missing.map(m => missingLabels[m]).join(', ')} tidak disebutkan — sudah diisi default, silakan sesuaikan sebelum approve.`
      : '';
    const parentNote = parentKey ? ` sebagai sub-item dari **${parentKey}**` : '';

    const plan: ActionPlan = {
      id: planId,
      intent: 'batch_create_issues',
      summary: `Buat ${tasks.length} task sekaligus di project ${targetProject}${parentNote}.${missingNote}`,
      risk: 'medium',
      requiresApproval: true,
      steps,
    };

    const validated = ActionPlanSchema.safeParse(plan);
    return validated.success ? validated.data : null;
  }

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
    if (intentResult.entities.parentIssueKey) changes.parent = intentResult.entities.parentIssueKey;

    const parentNote = intentResult.entities.parentIssueKey ? ` sebagai sub-item dari ${intentResult.entities.parentIssueKey}` : '';

    const plan: ActionPlan = {
      id: planId,
      intent: 'create_issue',
      summary: `Buat task "${title}"${parentNote} di project ${targetProject}`,
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
