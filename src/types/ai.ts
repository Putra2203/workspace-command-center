export type ActionCardType = 'issue_created' | 'issue_updated' | 'issue_list' | 'batch_issues_created' | 'error' | 'info';

export interface ActionCard {
  type: ActionCardType;
  title: string;
  message?: string;
  data: any;
}

export interface IntentResult {
  intent: 'list_projects' | 'list_issues' | 'create_issue' | 'batch_create_issues' | 'decompose' | 'plan' | 'get_issue' | 'update_issue' | 'help' | 'chat' | 'unknown';
  entities: {
    projectKey?: string;
    issueKey?: string;
    state?: string;
    assignee?: string;
    priority?: string;
    title?: string;
    description?: string;
    titles?: string[]; // For batch task creation
    tasks?: { title: string; description?: string; priority?: string }[]; // For rich batch task creation with descriptions
    filter?: string;
    chatReply?: string; // For conversational AI responses
  };
  confidence: number;
}

export interface ConversationContext {
  activeProjectId?: string;
  activeProjectKey?: string;
}

export type ActionStep = {
  operation: string;
  target: string;
  changes: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export type ActionPlan = {
  id: string;
  intent: string;
  summary: string;
  risk: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  steps: ActionStep[];
};
