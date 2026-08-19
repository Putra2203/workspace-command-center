export interface PlaneUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export interface PlaneProject {
  id: string;
  name: string;
  identifier: string;
  description?: string;
  total_members?: number;
  total_cycles?: number;
  total_modules?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlaneState {
  id: string;
  name: string;
  color: string;
  group: string;
  slug?: string;
  sequence?: number;
}

export interface PlaneMember {
  id: string;
  member: PlaneUser;
  role: number;
}

export interface PlaneIssue {
  id: string;
  name: string;
  sequence_id: number;
  state?: any;
  state_detail?: { id?: string; name: string; group: string; color: string };
  priority?: string;
  description_html?: string;
  start_date?: string;
  target_date?: string;
  assignees?: string[];
  project_detail?: { identifier: string; name?: string };
  created_at?: string;
  updated_at?: string;
}

export interface PlaneLabel {
  id: string;
  name: string;
  color: string;
}

export interface PlaneIssueComment {
  id: string;
  comment_html: string;
  created_at: string;
  actor: string;
}

export interface PlaneCycle {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  project_detail?: { id?: string; name?: string; identifier?: string };
  total_issues?: number;
  completed_issues?: number;
}

export interface PlaneModule {
  id: string;
  name: string;
  status?: string;
}
