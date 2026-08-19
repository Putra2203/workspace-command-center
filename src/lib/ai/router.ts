export type IntentTier = 'none' | 'light' | 'heavy';

export type ModelSelection = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

/**
 * Classifies an intent string into an explicit AI processing tier:
 * - 'none': Deterministic operations that bypass LLM or run pure logic (e.g. list_projects, list_issues, help).
 * - 'light': Fast, simple intent interpretation, search, or categorization tasks.
 * - 'heavy': Complex multi-step plan generation, task decomposition, summarization, or mutation planning.
 */
export function classifyIntentTier(intent: string): IntentTier {
  switch (intent) {
    case 'list_projects':
    case 'list_issues':
    case 'get_issue':
    case 'help':
      return 'none';

    case 'chat':
    case 'search':
    case 'categorize':
      return 'light';

    case 'create_issue':
    case 'update_issue':
    case 'batch_create_issues':
    case 'bulk_update':
    case 'decompose':
    case 'plan':
    case 'summarize':
      return 'heavy';

    default:
      return 'light';
  }
}

/**
 * Selects the optimal Gemini model based on intent tier and availability.
 */
export function selectModelForTier(tier: IntentTier): ModelSelection {
  if (tier === 'light') {
    return (process.env.GEMINI_LITE_MODEL as ModelSelection) || 'gemini-2.5-flash-lite';
  }
  return 'gemini-2.5-flash';
}
