import axios, { AxiosInstance } from 'axios';
import http from 'http';
import https from 'https';
import {
  PlaneProject,
  PlaneIssue,
  PlaneState,
  PlaneMember,
  PlaneLabel,
  PlaneIssueComment,
  PlaneCycle,
  PlaneModule,
  PlaneUser
} from '@/types/plane';
import { QueryCache } from '@/infrastructure/cache/QueryCache';

/**
 * Server-side PlaneService for making direct HTTP calls to the Plane API.
 */
export class PlaneService {
  private client: AxiosInstance;
  public defaultWorkspaceSlug: string;
  private cache = new QueryCache(60000); // 1 minute TTL, Supabase-backed

  constructor() {
    const apiHost = (process.env.PLANE_API_HOST || process.env.PLANE_API_URL || 'https://api.plane.so').replace(/\/$/, '');
    const apiKey = process.env.PLANE_API_KEY || '';
    this.defaultWorkspaceSlug = process.env.PLANE_WORKSPACE_SLUG || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const httpAgent = new http.Agent({ keepAlive: true, keepAliveMsecs: 10000 });
    const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 10000 });

    this.client = axios.create({
      baseURL: `${apiHost}/api/v1`,
      headers,
      timeout: 30000,
      httpAgent,
      httpsAgent,
    });

    // Auto-retry interceptor for 5xx errors
    this.client.interceptors.response.use(undefined, async (error) => {
      const config = error.config;
      if (!config || (config as any)._retry || !error.response || error.response.status < 500) {
        return Promise.reject(error);
      }
      (config as any)._retry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return this.client(config);
    });
  }

  private isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  /**
   * Resolve project key/identifier or name to UUID
   */
  async resolveProjectId(projectId: string): Promise<string> {
    if (this.isUUID(projectId)) {
      return projectId;
    }

    const projects = await this.listProjects();
    const searchLower = projectId.toLowerCase();

    const found = projects.find(
      (p) => p.id === projectId || p.identifier?.toLowerCase() === searchLower || p.name?.toLowerCase() === searchLower
    );

    if (found) {
      return found.id;
    }

    const available = projects.map((p) => `${p.identifier} (${p.name}) [id: ${p.id}]`).join(', ');
    throw new Error(
      `Project '${projectId}' was not found. Available projects in this workspace: ${available || 'None'}`
    );
  }

  /**
   * Resolve state name or group to state UUID
   */
  async resolveStateId(projectId: string, state: string): Promise<string> {
    if (this.isUUID(state)) {
      return state;
    }

    const realProjectId = await this.resolveProjectId(projectId);
    const states = await this.listStates(realProjectId);
    const searchLower = state.toLowerCase();

    const exactName = states.find((s) => s.name?.toLowerCase() === searchLower || s.slug?.toLowerCase() === searchLower);
    if (exactName) return exactName.id;

    const partialName = states.find((s) => s.name?.toLowerCase().includes(searchLower));
    if (partialName) return partialName.id;

    const groupMatch = states.find((s) => s.group?.toLowerCase() === searchLower);
    if (groupMatch) return groupMatch.id;

    const available = states.map((s) => `${s.name} (group: ${s.group})`).join(', ');
    throw new Error(
      `State '${state}' was not found for project '${projectId}'. Available states: ${available || 'None'}`
    );
  }

  /**
   * Resolve issue sequence key (e.g. PROJECT1-31 or 31) or title to issue UUID
   */
  async resolveIssueId(projectId: string, issueIdOrKey: string): Promise<string> {
    if (this.isUUID(issueIdOrKey)) {
      return issueIdOrKey;
    }

    const realProjectId = await this.resolveProjectId(projectId);
    const match = issueIdOrKey.match(/^(?:[A-Z0-9]+-)?(\d+)$/i);
    const seqNum = match ? parseInt(match[1], 10) : null;

    const issues = await this.listIssues(realProjectId);
    const found = issues.find(
      (i) =>
        i.id === issueIdOrKey ||
        (seqNum !== null && i.sequence_id === seqNum) ||
        i.name?.toLowerCase() === issueIdOrKey.toLowerCase()
    );

    if (found) {
      return found.id;
    }

    throw new Error(
      `Issue '${issueIdOrKey}' was not found in project '${projectId}'. Please specify a valid issue sequence key (e.g. PROJECT1-31 or 31).`
    );
  }

  /**
   * Resolve member ID to human full name
   */
  async resolveMemberName(projectId: string, memberId: string): Promise<string> {
    if (!this.isUUID(memberId)) {
      return memberId;
    }

    try {
      const realProjectId = await this.resolveProjectId(projectId);
      const members = await this.listMembers(realProjectId);
      const found = members.find(m => m.id === memberId || m.member?.id === memberId);
      if (found && found.member) {
        const fullName = `${found.member.first_name || ''} ${found.member.last_name || ''}`.trim();
        return fullName || found.member.email || memberId;
      }
    } catch {
      // Fallback
    }
    return 'Unassigned';
  }

  /**
   * Get Map of Member UUID -> Human Full Name
   */
  async getMemberMap(projectId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const realProjectId = await this.resolveProjectId(projectId);
      const members = await this.listMembers(realProjectId);
      for (const m of members) {
        const name = m.member ? `${m.member.first_name || ''} ${m.member.last_name || ''}`.trim() || m.member.email : '';
        if (m.id && name) map.set(m.id, name);
        if (m.member?.id && name) map.set(m.member.id, name);
      }
    } catch {
      // Return empty map on error
    }
    return map;
  }

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<PlaneUser> {
    const cacheKey = 'users_me';
    const cached = await this.cache.get<PlaneUser>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get('/users/me/');
    await this.cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * List projects in the default workspace
   */
  async listProjects(bypassCache = false): Promise<PlaneProject[]> {
    const slug = this.defaultWorkspaceSlug;
    const cacheKey = `projects_${slug}`;
    if (!bypassCache) {
      const cached = await this.cache.get<PlaneProject[]>(cacheKey);
      if (cached) return cached;
    }

    const response = await this.client.get(`/workspaces/${slug}/projects/`);
    const projects: PlaneProject[] = response.data.results || response.data;
    await this.cache.set(cacheKey, projects);
    return projects;
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<PlaneProject> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/`);
    return response.data;
  }

  /**
   * List states for a project
   */
  async listStates(projectId: string, bypassCache = false): Promise<PlaneState[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const cacheKey = `states_${slug}_${realProjectId}`;
    if (!bypassCache) {
      const cached = await this.cache.get<PlaneState[]>(cacheKey);
      if (cached) return cached;
    }

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/states/`);
    const states: PlaneState[] = response.data.results || response.data;
    await this.cache.set(cacheKey, states);
    return states;
  }

  /**
   * List members for a project
   */
  async listMembers(projectId: string): Promise<PlaneMember[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const cacheKey = `members_${slug}_${realProjectId}`;
    const cached = await this.cache.get<PlaneMember[]>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/members/`);
    const members: PlaneMember[] = response.data.results || response.data;
    await this.cache.set(cacheKey, members);
    return members;
  }

  /**
   * List issues for a project (with optional filters)
   */
  async listIssues(projectId: string, params?: Record<string, any>): Promise<PlaneIssue[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    
    // Clean params object
    const queryParams: Record<string, any> = {
      order_by: '-created_at',
      per_page: 100,
      ...params,
    };
    
    // Remove null/undefined/empty string filters
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') {
        delete queryParams[key];
      }
    });

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/issues/`, { params: queryParams });
    return response.data.results || response.data;
  }

  /**
   * Get issue details
   */
  async getIssue(projectId: string, issueId: string): Promise<PlaneIssue> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);
    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/`);
    return response.data;
  }

  /**
   * Create an issue
   */
  async createIssue(projectId: string, data: Record<string, any>): Promise<PlaneIssue> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);

    // Resolve state name to state UUID if provided
    if (data.state && typeof data.state === 'string' && !this.isUUID(data.state)) {
      data.state = await this.resolveStateId(realProjectId, data.state);
    }

    const response = await this.client.post(`/workspaces/${slug}/projects/${realProjectId}/issues/`, data);
    await this.cache.deletePrefix(`issues_${slug}_${realProjectId}`);
    return response.data;
  }

  /**
   * Update an issue
   */
  async updateIssue(projectId: string, issueId: string, data: Record<string, any>): Promise<PlaneIssue> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);

    // Resolve state name to state UUID if provided
    if (data.state && typeof data.state === 'string' && !this.isUUID(data.state)) {
      data.state = await this.resolveStateId(realProjectId, data.state);
    }

    const response = await this.client.patch(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/`, data);
    await this.cache.deletePrefix(`issues_${slug}_${realProjectId}`);
    return response.data;
  }

  /**
   * Delete an issue
   */
  async deleteIssue(projectId: string, issueId: string): Promise<{ success: boolean }> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);
    await this.client.delete(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/`);
    await this.cache.deletePrefix(`issues_${slug}_${realProjectId}`);
    return { success: true };
  }

  /**
   * List labels for a project
   */
  async listLabels(projectId: string): Promise<PlaneLabel[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const cacheKey = `labels_${slug}_${realProjectId}`;
    const cached = await this.cache.get<PlaneLabel[]>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/labels/`);
    const labels: PlaneLabel[] = response.data.results || response.data;
    await this.cache.set(cacheKey, labels);
    return labels;
  }

  /**
   * List comments for an issue
   */
  async listComments(projectId: string, issueId: string): Promise<PlaneIssueComment[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);
    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/comments/`);
    return response.data.results || response.data;
  }

  /**
   * Add a comment to an issue
   */
  async addComment(projectId: string, issueId: string, comment_html: string): Promise<PlaneIssueComment> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);
    const response = await this.client.post(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/comments/`, {
      comment_html,
    });
    return response.data;
  }

  /**
   * List cycles for a project
   */
  async listCycles(projectId: string): Promise<PlaneCycle[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const cacheKey = `cycles_${slug}_${realProjectId}`;
    const cached = await this.cache.get<PlaneCycle[]>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/cycles/`);
    const cycles: PlaneCycle[] = response.data.results || response.data;
    await this.cache.set(cacheKey, cycles);
    return cycles;
  }

  /**
   * List modules for a project
   */
  async listModules(projectId: string): Promise<PlaneModule[]> {
    const slug = this.defaultWorkspaceSlug;
    const realProjectId = await this.resolveProjectId(projectId);
    const cacheKey = `modules_${slug}_${realProjectId}`;
    const cached = await this.cache.get<PlaneModule[]>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/modules/`);
    const modules: PlaneModule[] = response.data.results || response.data;
    await this.cache.set(cacheKey, modules);
    return modules;
  }
}

// Module-level singleton: PLANE_WORKSPACE_SLUG is a single global env var
// today (no multi-workspace support), so one shared instance is enough.
// Constructing a new PlaneService() per request (the previous pattern in
// both API route files) recreated its TTLCache on every call, making it a
// no-op — this instance persists across requests within the same process.
const globalForPlaneService = globalThis as unknown as { planeService?: PlaneService };

export const planeService = globalForPlaneService.planeService ?? new PlaneService();

if (process.env.NODE_ENV !== 'production') {
  globalForPlaneService.planeService = planeService;
}
