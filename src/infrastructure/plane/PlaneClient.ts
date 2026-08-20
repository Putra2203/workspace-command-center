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
    const rawHost = process.env.PLANE_API_HOST || process.env.PLANE_API_URL || 'https://api.plane.so';
    const apiHost = rawHost.replace(/\/$/, '');
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

  /**
   * Get workspace slug dynamically from process.env or auto-resolve via Plane API /workspaces/
   */
  async getWorkspaceSlug(): Promise<string> {
    if (this.defaultWorkspaceSlug && this.defaultWorkspaceSlug.trim()) {
      return this.defaultWorkspaceSlug;
    }

    try {
      const response = await this.client.get('/workspaces/');
      const workspaces = response.data.results || response.data;
      if (Array.isArray(workspaces) && workspaces.length > 0 && workspaces[0].slug) {
        this.defaultWorkspaceSlug = workspaces[0].slug;
        return this.defaultWorkspaceSlug;
      }
    } catch (err) {
      console.error('Failed to dynamically resolve workspace slug from Plane API:', err);
    }

    throw new Error('PLANE_WORKSPACE_SLUG environment variable is missing and could not be auto-resolved from Plane API.');
  }

  private isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  /**
   * Resolve project key/identifier or name to UUID with 5-tier fuzzy matching
   */
  async resolveProjectId(projectId: string): Promise<string> {
    if (!projectId || projectId.trim().toUpperCase() === 'ALL') {
      return 'ALL';
    }

    if (this.isUUID(projectId)) {
      return projectId;
    }

    const projects = await this.listProjects();
    const searchLower = projectId.trim().toLowerCase();

    // Tier 1: Exact identifier match (e.g. "BSJ")
    const exactIdentifier = projects.find(p => p.identifier?.toLowerCase() === searchLower);
    if (exactIdentifier) return exactIdentifier.id;

    // Tier 2: Exact project name match (e.g. "BSJ Phase 4")
    const exactName = projects.find(p => p.name?.toLowerCase() === searchLower);
    if (exactName) return exactName.id;

    // Tier 3: Substring match (project name includes query or query includes project name)
    const substringMatch = projects.find(
      p => (p.name && (p.name.toLowerCase().includes(searchLower) || searchLower.includes(p.name.toLowerCase()))) ||
           (p.identifier && (p.identifier.toLowerCase().includes(searchLower) || searchLower.includes(p.identifier.toLowerCase())))
    );
    if (substringMatch) return substringMatch.id;

    // Tier 4: Phase number or keyword token match (e.g. "bsj phase 4" -> matches "BSJ" and "Phase 4")
    const tokens = searchLower.split(/[\s\-_]+/).filter(t => t.length > 0);
    const tokenMatch = projects.find(p => {
      const pNameLower = (p.name || '').toLowerCase();
      const pIdLower = (p.identifier || '').toLowerCase();
      return tokens.every(tok => pNameLower.includes(tok) || pIdLower.includes(tok));
    });
    if (tokenMatch) return tokenMatch.id;

    // Tier 5: Prefix/acronym match
    const prefixMatch = projects.find(p => {
      const pIdLower = (p.identifier || '').toLowerCase();
      return tokens.some(tok => tok.startsWith(pIdLower) || pIdLower.startsWith(tok));
    });
    if (prefixMatch) return prefixMatch.id;

    const available = projects.map((p) => `${p.identifier} ("${p.name}")`).join(', ');
    throw new Error(
      `Project '${projectId}' was not found. Available projects in this workspace: ${available || 'None'}`
    );
  }

  /**
   * Resolve state name or group to state UUID with Indonesian colloquial support
   */
  async resolveStateId(projectId: string, state: string): Promise<string> {
    if (this.isUUID(state)) {
      return state;
    }

    const realProjectId = await this.resolveProjectId(projectId);
    const states = await this.listStates(realProjectId);
    const searchLower = state.trim().toLowerCase();

    // Map Indonesian colloquial terms to state groups
    let targetGroup: string | null = null;
    if (['selesai', 'beres', 'kelar', 'done', 'completed'].includes(searchLower)) {
      targetGroup = 'completed';
    } else if (['sedang jalan', 'sedang berjalan', 'on progress', 'wip', 'started', 'in progress', 'progres'].includes(searchLower)) {
      targetGroup = 'started';
    } else if (['todo', 'belum dimulai', 'unstarted', 'open'].includes(searchLower)) {
      targetGroup = 'unstarted';
    } else if (['backlog', 'tunda', 'nanti'].includes(searchLower)) {
      targetGroup = 'backlog';
    } else if (['batal', 'cancelled', 'canceled'].includes(searchLower)) {
      targetGroup = 'cancelled';
    }

    // Exact state name match
    const exactName = states.find((s) => s.name?.toLowerCase() === searchLower || s.slug?.toLowerCase() === searchLower);
    if (exactName) return exactName.id;

    // Group match based on normalized group
    if (targetGroup) {
      const groupMatch = states.find((s) => s.group?.toLowerCase() === targetGroup);
      if (groupMatch) return groupMatch.id;
    }

    // Partial state name match
    const partialName = states.find((s) => s.name?.toLowerCase().includes(searchLower));
    if (partialName) return partialName.id;

    // Direct group match from input
    const directGroupMatch = states.find((s) => s.group?.toLowerCase() === searchLower);
    if (directGroupMatch) return directGroupMatch.id;

    const available = states.map((s) => `${s.name} (group: ${s.group})`).join(', ');
    throw new Error(
      `State '${state}' was not found for project '${projectId}'. Available states: ${available || 'None'}`
    );
  }

  /**
   * Resolve member by name or email query
   */
  async resolveMemberId(projectId: string, memberQuery: string): Promise<string> {
    if (this.isUUID(memberQuery)) {
      return memberQuery;
    }

    const realProjectId = await this.resolveProjectId(projectId);
    const members = await this.listMembers(realProjectId);
    const searchLower = memberQuery.trim().toLowerCase();

    const found = members.find(m => {
      if (!m.member) return false;
      const firstName = (m.member.first_name || '').toLowerCase();
      const lastName = (m.member.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = (m.member.email || '').toLowerCase();

      return fullName.includes(searchLower) ||
             firstName.includes(searchLower) ||
             lastName.includes(searchLower) ||
             email.startsWith(searchLower);
    });

    if (found && (found.id || found.member?.id)) {
      return found.id || found.member!.id;
    }

    throw new Error(`Member '${memberQuery}' was not found in project '${projectId}'.`);
  }

  /**
   * Resolve issue sequence key or title and its target project UUID
   */
  async resolveIssueInfo(projectId: string, issueIdOrKey: string): Promise<{ issueId: string; realProjectId: string }> {
    if (this.isUUID(issueIdOrKey) && projectId !== 'ALL') {
      return { issueId: issueIdOrKey, realProjectId: projectId };
    }

    const realProjectId = await this.resolveProjectId(projectId);
    const match = issueIdOrKey.match(/^(?:([A-Z0-9]+)-)?(\d+)$/i);
    const projectCode = match ? match[1] : null;
    const seqNum = match ? parseInt(match[2], 10) : null;

    let searchProjectId = realProjectId;
    if (projectCode) {
      try {
        searchProjectId = await this.resolveProjectId(projectCode);
      } catch {
        // Fallback
      }
    }

    const issues = await this.listIssues(searchProjectId);
    const found = issues.find(
      (i) =>
        i.id === issueIdOrKey ||
        (seqNum !== null && i.sequence_id === seqNum) ||
        i.name?.toLowerCase() === issueIdOrKey.toLowerCase()
    );

    if (found) {
      const actualProjId = (found as any).project || (found as any).project_detail?.id || searchProjectId;
      return {
        issueId: found.id,
        realProjectId: actualProjId === 'ALL' ? (searchProjectId !== 'ALL' ? searchProjectId : actualProjId) : actualProjId,
      };
    }

    throw new Error(
      `Issue '${issueIdOrKey}' was not found in project '${projectId}'. Please specify a valid issue sequence key (e.g. PROJECT1-31 or 31).`
    );
  }

  /**
   * Resolve issue sequence key (e.g. PROJECT1-31 or 31) or title to issue UUID
   */
  async resolveIssueId(projectId: string, issueIdOrKey: string): Promise<string> {
    const { issueId } = await this.resolveIssueInfo(projectId, issueIdOrKey);
    return issueId;
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
    const slug = await this.getWorkspaceSlug();
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
    const slug = await this.getWorkspaceSlug();
    const realProjectId = await this.resolveProjectId(projectId);
    if (realProjectId === 'ALL') {
      return {
        id: 'ALL',
        identifier: 'ALL',
        name: 'All Projects',
        description: 'Workspace-wide view of all projects',
      } as any;
    }
    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/`);
    return response.data;
  }

  /**
   * List states for a project
   */
  async listStates(projectId: string, bypassCache = false): Promise<PlaneState[]> {
    const slug = await this.getWorkspaceSlug();
    const realProjectId = await this.resolveProjectId(projectId);
    if (realProjectId === 'ALL') {
      const projects = await this.listProjects();
      const statesArrays = await Promise.all(projects.map(p => this.listStates(p.id, bypassCache).catch(() => [])));
      const uniqueStates: PlaneState[] = [];
      const seen = new Set<string>();
      statesArrays.flat().forEach(s => {
        const key = (s.name || '').trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueStates.push(s);
        }
      });
      return uniqueStates;
    }
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
    const slug = await this.getWorkspaceSlug();
    const realProjectId = await this.resolveProjectId(projectId);
    if (realProjectId === 'ALL') {
      const projects = await this.listProjects();
      const membersArrays = await Promise.all(projects.map(p => this.listMembers(p.id).catch(() => [])));
      const uniqueMembers: PlaneMember[] = [];
      const seen = new Set<string>();
      membersArrays.flat().forEach(m => {
        if (!m) return;
        const key = m.id || (m as any).email || ((m as any).member ? (m as any).member.id : '');
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueMembers.push(m);
        }
      });
      return uniqueMembers;
    }
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
    const slug = await this.getWorkspaceSlug();
    const realProjectId = await this.resolveProjectId(projectId);
    if (realProjectId === 'ALL') {
      const projects = await this.listProjects();
      const issuesArrays = await Promise.all(projects.map(p => this.listIssues(p.id, params).catch(() => [])));
      return issuesArrays.flat();
    }

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
    const slug = await this.getWorkspaceSlug();
    const { issueId: realIssueId, realProjectId } = await this.resolveIssueInfo(projectId, issueId);
    const targetProj = realProjectId === 'ALL' ? (await this.listProjects())[0]?.id : realProjectId;
    const response = await this.client.get(`/workspaces/${slug}/projects/${targetProj}/issues/${realIssueId}/`);
    return response.data;
  }

  /**
   * Create an issue
   */
  async createIssue(projectId: string, data: Record<string, any>): Promise<PlaneIssue> {
    const slug = await this.getWorkspaceSlug();
    let realProjectId = await this.resolveProjectId(projectId);
    if (realProjectId === 'ALL') {
      const projects = await this.listProjects();
      if (projects.length === 0) throw new Error('No available projects in this workspace to create issue.');
      realProjectId = projects[0].id;
    }

    const payload: Record<string, any> = { ...data };
    if (!payload.name && payload.title) {
      payload.name = payload.title;
    }
    if (!payload.description_html && payload.description) {
      payload.description_html = `<p>${payload.description}</p>`;
    }

    // Resolve state name to state UUID if provided
    if (payload.state && typeof payload.state === 'string' && !this.isUUID(payload.state)) {
      payload.state = await this.resolveStateId(realProjectId, payload.state);
    }

    const response = await this.client.post(`/workspaces/${slug}/projects/${realProjectId}/issues/`, payload);
    await this.cache.deletePrefix(`issues_${slug}_${realProjectId}`);
    return response.data;
  }

  /**
   * Update an issue
   */
  async updateIssue(projectId: string, issueId: string, data: Record<string, any>): Promise<PlaneIssue> {
    const slug = await this.getWorkspaceSlug();
    const { issueId: realIssueId, realProjectId } = await this.resolveIssueInfo(projectId, issueId);
    const targetProj = realProjectId === 'ALL' ? (await this.listProjects())[0]?.id : realProjectId;

    // Resolve state name to state UUID if provided
    if (data.state && typeof data.state === 'string' && !this.isUUID(data.state)) {
      data.state = await this.resolveStateId(targetProj, data.state);
    }

    const response = await this.client.patch(`/workspaces/${slug}/projects/${targetProj}/issues/${realIssueId}/`, data);
    await this.cache.deletePrefix(`issues_${slug}_${targetProj}`);
    return response.data;
  }

  /**
   * Delete an issue
   */
  async deleteIssue(projectId: string, issueId: string): Promise<{ success: boolean }> {
    const slug = await this.getWorkspaceSlug();
    const { issueId: realIssueId, realProjectId } = await this.resolveIssueInfo(projectId, issueId);
    const targetProj = realProjectId === 'ALL' ? (await this.listProjects())[0]?.id : realProjectId;
    await this.client.delete(`/workspaces/${slug}/projects/${targetProj}/issues/${realIssueId}/`);
    await this.cache.deletePrefix(`issues_${slug}_${targetProj}`);
    return { success: true };
  }

  /**
   * List labels for a project
   */
  async listLabels(projectId: string): Promise<PlaneLabel[]> {
    const slug = await this.getWorkspaceSlug();
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
    const slug = await this.getWorkspaceSlug();
    const realProjectId = await this.resolveProjectId(projectId);
    const realIssueId = await this.resolveIssueId(realProjectId, issueId);
    const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/issues/${realIssueId}/comments/`);
    return response.data.results || response.data;
  }

  /**
   * Add a comment to an issue
   */
  async addComment(projectId: string, issueId: string, comment_html: string): Promise<PlaneIssueComment> {
    const slug = await this.getWorkspaceSlug();
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
    const slug = await this.getWorkspaceSlug();
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
   * List issues for a specific cycle
   */
  async listCycleIssues(projectId: string, cycleId: string): Promise<PlaneIssue[]> {
    try {
      const slug = await this.getWorkspaceSlug();
      const realProjectId = await this.resolveProjectId(projectId);
      
      // Try primary official cycle-issues endpoint
      try {
        const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/cycles/${cycleId}/cycle-issues/`);
        const results = response.data.results || response.data;
        if (Array.isArray(results)) {
          return results.map((item: any) => item.issue_detail || item);
        }
      } catch {
        // ignore & try next fallback
      }

      // Try secondary /cycles/{cycleId}/issues/ endpoint
      try {
        const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/cycles/${cycleId}/issues/`);
        const results = response.data.results || response.data;
        if (Array.isArray(results)) {
          return results.map((item: any) => item.issue_detail || item);
        }
      } catch {
        // ignore & try next fallback
      }

      // Fallback: list issues with cycle query parameter
      try {
        const response = await this.client.get(`/workspaces/${slug}/projects/${realProjectId}/issues/`, {
          params: { cycle: cycleId },
        });
        const results = response.data.results || response.data;
        return Array.isArray(results) ? results : [];
      } catch {
        return [];
      }
    } catch (err) {
      console.error('Error in listCycleIssues:', err);
      return [];
    }
  }

  /**
   * List modules for a project
   */
  async listModules(projectId: string): Promise<PlaneModule[]> {
    const slug = await this.getWorkspaceSlug();
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
