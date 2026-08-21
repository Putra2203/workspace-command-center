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
    tasks?: {
      title: string;
      description?: string;
      priority?: string;
      assignee?: string; // Per-task assignee name/email, resolved to UUID at execution time
      state?: string; // Per-task status name (e.g. "Todo", "In Progress")
      dueDate?: string; // Per-task due date, ISO (YYYY-MM-DD) after LLM normalization
    }[]; // For rich batch task creation with descriptions
    dueDate?: string; // Shared due date applied to a whole batch when not overridden per-task
    parentIssueKey?: string; // When set, new issue(s) are created as sub-items of this existing issue
    filter?: string;
    userScope?: 'my_tasks' | 'all';
    chatReply?: string; // For conversational AI responses
    options?: { label: string; value: string; action?: string }[]; // For clarification chips
    batchDefaultsMissing?: ('assignee' | 'state' | 'dueDate')[]; // Fields not mentioned anywhere in the batch command
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
