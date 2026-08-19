import { IntentResult, ConversationContext } from '@/types/ai';

/**
 * Parses user input to determine the intent and extract relevant entities.
 * Supports Plane commands, bulk task creation, and Gemini LLM conversational chat.
 */
export async function parseIntentAsync(message: string, context?: ConversationContext): IntentResultAsync {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // First check if it's a direct greeting or conversational query
  const lowerMsg = message.trim().toLowerCase();
  const isGreeting = /^(hai|halo|hi|hey|hello|p|tes|test|apa kabar|siapa kamu|siapa anda|selamat pagi|selamat siang|selamat malam)\b/i.test(lowerMsg);

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      // If it's a casual chat or non-command query, generate a friendly AI conversational reply directly
      const intentCheck = parseIntent(message, context);
      if (isGreeting || intentCheck.intent === 'unknown' || intentCheck.intent === 'chat' || intentCheck.intent === 'help') {
        const chatResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are Plane AI Command Center, an intelligent assistant for project management.
Respond to the user naturally, warmly, and helpfully in Indonesian (or the language of their prompt).
If they say hello or ask a question, greet them and briefly explain that you can manage Plane tasks (list tasks, create tasks, update issue status, bulk tasks).

User message: "${message}"`,
        });

        const text = typeof (chatResponse as any).text === 'function' ? (chatResponse as any).text() : (chatResponse as any).text;
        return {
          intent: 'chat',
          entities: { chatReply: text || 'Halo! Saya Plane AI Command Center. Ada yang bisa saya bantu dengan project Anda?' },
          confidence: 0.95,
        };
      }

      // Otherwise parse command intents via Gemini JSON
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI intent parser for Plane Project Management. Analyze the user prompt and return JSON with intent and entities.
Valid intents: "list_projects", "list_issues", "create_issue", "batch_create_issues", "get_issue", "update_issue", "help", "chat", "unknown".

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

  // Fallback if no Gemini key or error
  const fallbackResult = parseIntent(message, context);
  if (isGreeting || fallbackResult.intent === 'unknown') {
    return {
      intent: 'chat',
      entities: {
        chatReply: 'Halo! 👋 Saya **Plane AI Command Center**.\n\nSaya bisa membantu Anda mengelola project Plane secara otomatis. Contoh perintah:\n- *"Tampilkan task PROJECT1"*\n- *"Buat task fix login bug"*\n- *"Pindahkan task PROJECT1-31 ke Done"*\n- *"Masukin 3 task: 1. Fix bug 2. Update UI 3. Test API"*',
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

  // 1. Extract Project key (e.g. a Plane project identifier like PROJECT1)
  const projectMatch = message.match(/\b([A-Z0-9]{2,12})\b/);
  if (projectMatch && !projectMatch[1].includes('-')) {
    result.entities.projectKey = projectMatch[1];
  } else if (context?.activeProjectKey) {
    result.entities.projectKey = context.activeProjectKey;
  }

  // 2. Extract Issue key (e.g. PROJECT1-31)
  const issueMatch = message.match(/\b([A-Z0-9]+-\d+)\b/i);
  if (issueMatch) {
    result.entities.issueKey = issueMatch[1].toUpperCase();
  }

  // 3. Extract Priority
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

  // 4. Extract State
  const states = ['done', 'in progress', 'todo', 'backlog', 'cancelled', 'selesai', 'sedang berjalan'];
  for (const state of states) {
    if (lowerMessage.includes(state)) {
      result.entities.state = state === 'selesai' ? 'done' : state === 'sedang berjalan' ? 'in progress' : state;
      break;
    }
  }

  // 5. Check for Bulk Multi-Task Creation (Numbering like 1., 2., 3. or newlines/bullets)
  const isCreationPrompt = /buat|create|masukin|tambah|input|new task|new issue/i.test(lowerMessage);
  if (isCreationPrompt) {
    const listItems = message
      .split(/(?:\r?\n|\b\d+[\.\)]\s*|[\-\•]\s*)/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && !/^(buat|create|masukin|tambah|input|task|issue|ke project|di project)/i.test(s));

    if (listItems.length >= 2) {
      result.intent = 'batch_create_issues';
      result.entities.titles = listItems;
      result.confidence = 0.9;
      return result;
    }

    const afterActionText = message.replace(/^.*?(?:buat|create|masukin|tambah|input)\s+(?:task|issue|tiket)?\s*(?:di|ke)?\s*(?:project)?\s*[A-Z0-9]*\s*(?:yaitu|berikut|:)?\s*/i, '');
    const parts = afterActionText.split(/,|\bdan\b|\blalu\b|\bserta\b/i).map(s => s.trim()).filter(s => s.length > 2);
    if (parts.length >= 2) {
      result.intent = 'batch_create_issues';
      result.entities.titles = parts;
      result.confidence = 0.85;
      return result;
    }

    if (afterActionText.trim().length > 0) {
      result.intent = 'create_issue';
      result.entities.title = afterActionText.trim();
      result.confidence = 0.8;
      return result;
    }
  }

  // Intent patterns
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
