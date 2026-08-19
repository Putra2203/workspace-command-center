export type ActionCardType = 'issue_created' | 'issue_updated' | 'issue_list' | 'batch_issues_created' | 'error' | 'info';

export interface ActionCard {
  type: ActionCardType;
  title: string;
  message?: string;
  data: any;
}

export interface IntentResult {
  intent: 'list_projects' | 'list_issues' | 'create_issue' | 'batch_create_issues' | 'get_issue' | 'update_issue' | 'help' | 'chat' | 'unknown';
  entities: {
    projectKey?: string;
    issueKey?: string;
    state?: string;
    assignee?: string;
    priority?: string;
    title?: string;
    titles?: string[]; // For batch task creation
    filter?: string;
    chatReply?: string; // For conversational AI responses
  };
  confidence: number;
}

export interface ConversationContext {
  activeProjectId?: string;
  activeProjectKey?: string;
}
