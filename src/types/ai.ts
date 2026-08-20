export type ActionCardType = 'issue_created' | 'issue_updated' | 'issue_list' | 'batch_issues_created' | 'clarification' | 'operation_receipt' | 'error' | 'info';

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
    userScope?: 'my_tasks' | 'all';
    chatReply?: string; // For conversational AI responses
    options?: { label: string; value: string; action?: string }[]; // For clarification chips
  };
  confidence: number;
}

export interface ConversationContext {
  activeProjectId?: string;
  activeProjectKey?: string;
  availableProjects?: { id: string; identifier: string; name: string }[];
  availableMembers?: { id: string; name: string; email: string }[];
  availableStates?: { id: string; name: string; group: string }[];
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
