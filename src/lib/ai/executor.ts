import { IntentResult, ActionCard } from '@/types/ai';
import { PlaneService } from '@/infrastructure/plane/PlaneClient';

/**
 * Executes a parsed intent using the PlaneService.
 */
export async function executeIntent(
  intent: IntentResult, 
  planeService: PlaneService,
  options?: { userScope?: 'my_tasks' | 'all'; currentUserId?: string }
): Promise<ActionCard[]> {
  const cards: ActionCard[] = [];
  
  try {
    switch (intent.intent) {
      case 'list_projects': {
        const projects = await planeService.listProjects();
        cards.push({
          type: 'info',
          title: `Workspace Projects (${projects.length})`,
          data: {
            items: projects.map(p => ({
              id: p.id,
              key: p.identifier,
              name: p.name,
              total_members: p.total_members,
            }))
          },
        });
        break;
      }

      case 'list_issues': {
        if (!intent.entities.projectKey) {
          throw new Error('Project key is required to list issues.');
        }
        
        const realProjectId = await planeService.resolveProjectId(intent.entities.projectKey);
        
        // Resolve project human-readable identifier (e.g. a Plane project's short code)
        const projects = await planeService.listProjects().catch(() => []);
        const foundProj = projects.find(p => p.id === realProjectId || p.identifier?.toLowerCase() === intent.entities.projectKey?.toLowerCase());
        const displayKey = foundProj?.identifier || 'PROJECT';
        const displayProjectName = foundProj?.name || displayKey;

        // Fetch states for this project to resolve state UUID -> state Name (e.g. Done, In Progress, Backlog)
        const states = await planeService.listStates(realProjectId).catch(() => []);
        const stateMap = new Map<string, { name: string; color: string }>();
        states.forEach(s => stateMap.set(s.id, { name: s.name, color: s.color }));

        // Fetch member map to resolve assignee names
        const memberMap = await planeService.getMemberMap(realProjectId).catch(() => new Map<string, string>());

        // Fetch issues
        let issues = await planeService.listIssues(realProjectId, {
          priority: intent.entities.priority,
        });

        // Filter by user scope if my_tasks is active. Fail closed: with no
        // resolved current-user identity, show nothing rather than guessing.
        if (options?.userScope === 'my_tasks') {
          const currentUserId = options.currentUserId;
          issues = issues.filter(i => {
            if (!currentUserId || !i.assignees || i.assignees.length === 0) return false;
            return i.assignees.includes(currentUserId);
          });
        }
        
        cards.push({
          type: 'issue_list',
          title: `${displayProjectName} (${displayKey}) - ${issues.length} Tasks ${options?.userScope === 'my_tasks' ? '(Mine)' : ''}`,
          data: {
            items: issues.map(i => {
              const stateId = typeof i.state === 'string' ? i.state : i.state?.id || i.state_detail?.id || '';
              const stateInfo = stateMap.get(stateId) || { name: i.state_detail?.name || 'Open', color: '#3B82F6' };
              const assigneeId = i.assignees && i.assignees.length > 0 ? i.assignees[0] : '';
              const assigneeName = memberMap.get(assigneeId) || (assigneeId ? 'Assigned' : 'Unassigned');

              return {
                id: i.id,
                key: `${displayKey}-${i.sequence_id}`,
                title: i.name || 'Untitled Task',
                state: stateInfo.name,
                stateColor: stateInfo.color,
                priority: i.priority || 'none',
                assignee: assigneeName,
              };
            })
          },
        });
        break;
      }

      case 'batch_create_issues': {
        if (!intent.entities.projectKey) {
          throw new Error('Project key is required to create issues.');
        }

        const titles = intent.entities.titles || [];
        if (titles.length === 0) {
          throw new Error('No task titles provided for bulk creation.');
        }

        const realProjectId = await planeService.resolveProjectId(intent.entities.projectKey);
        const projects = await planeService.listProjects().catch(() => []);
        const foundProj = projects.find(p => p.id === realProjectId);
        const displayKey = foundProj?.identifier || intent.entities.projectKey;

        // Create all issues concurrently in parallel
        const createdIssues = await Promise.all(
          titles.map(title =>
            planeService.createIssue(realProjectId, {
              name: title,
              priority: intent.entities.priority || 'none',
            })
          )
        );

        cards.push({
          type: 'batch_issues_created',
          title: `Successfully Created ${createdIssues.length} Tasks in ${displayKey}`,
          data: {
            items: createdIssues.map(issue => ({
              id: issue.id,
              key: `${displayKey}-${issue.sequence_id}`,
              title: issue.name,
              priority: issue.priority || 'none',
              state: 'Backlog',
            }))
          },
        });
        break;
      }

      case 'create_issue': {
        if (!intent.entities.projectKey) {
          throw new Error('Project key is required to create an issue.');
        }

        const realProjectId = await planeService.resolveProjectId(intent.entities.projectKey);
        const projects = await planeService.listProjects().catch(() => []);
        const foundProj = projects.find(p => p.id === realProjectId);
        const displayKey = foundProj?.identifier || 'PROJECT';

        const newIssue = await planeService.createIssue(realProjectId, {
          name: intent.entities.title || 'New Issue via AI Command Center',
          priority: intent.entities.priority || 'none',
        });
        
        cards.push({
          type: 'issue_created',
          title: 'Issue Created Successfully',
          data: {
            id: newIssue.id,
            key: `${displayKey}-${newIssue.sequence_id}`,
            title: newIssue.name,
            assignee: 'Unassigned',
          },
        });
        break;
      }

      case 'get_issue': {
        if (!intent.entities.projectKey || !intent.entities.issueKey) {
          throw new Error('Project key and Issue key are required.');
        }
        const realProjectId = await planeService.resolveProjectId(intent.entities.projectKey);
        const issue = await planeService.getIssue(realProjectId, intent.entities.issueKey);
        
        // Resolve project key, state name, and assignee
        const projects = await planeService.listProjects().catch(() => []);
        const foundProj = projects.find(p => p.id === realProjectId);
        const displayKey = foundProj?.identifier || intent.entities.projectKey;

        const states = await planeService.listStates(realProjectId).catch(() => []);
        const stateId = typeof issue.state === 'string' ? issue.state : issue.state?.id || issue.state_detail?.id || '';
        const matchingState = states.find(s => s.id === stateId);
        const stateName = matchingState?.name || issue.state_detail?.name || 'Open';

        const assigneeId = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '';
        const assigneeName = assigneeId ? await planeService.resolveMemberName(realProjectId, assigneeId) : 'Unassigned';

        cards.push({
          type: 'info',
          title: `Task Details: ${displayKey}-${issue.sequence_id}`,
          message: issue.name,
          data: {
            key: `${displayKey}-${issue.sequence_id}`,
            title: issue.name,
            state: stateName,
            priority: issue.priority || 'none',
            assignee: assigneeName,
            created_at: issue.created_at ? new Date(issue.created_at).toLocaleDateString() : undefined,
          },
        });
        break;
      }

      case 'update_issue': {
        if (!intent.entities.projectKey || !intent.entities.issueKey) {
          throw new Error('Project key and Issue key are required.');
        }

        const realProjectId = await planeService.resolveProjectId(intent.entities.projectKey);
        const updatePayload: Record<string, any> = {};

        if (intent.entities.state) {
          const stateId = await planeService.resolveStateId(realProjectId, intent.entities.state);
          updatePayload.state = stateId;
        }

        if (intent.entities.priority) {
          updatePayload.priority = intent.entities.priority;
        }

        const updatedIssue = await planeService.updateIssue(realProjectId, intent.entities.issueKey, updatePayload);
        
        cards.push({
          type: 'issue_updated',
          title: 'Issue Updated Successfully',
          message: `Updated issue ${intent.entities.issueKey}${intent.entities.state ? ` state to "${intent.entities.state}"` : ''}`,
          data: {
            key: intent.entities.issueKey,
            title: updatedIssue.name,
            state: intent.entities.state || 'Updated',
          },
        });
        break;
      }

      case 'chat': {
        break;
      }

      case 'help': {
        cards.push({
          type: 'info',
          title: 'Available AI Commands',
          data: {
            message: 'You can say: "tampilkan task PROJECT1", "buat 3 task di PROJECT1: 1. Fix login bug 2. Responsive UI 3. Test API", or "pindahkan task PROJECT1-2 ke Done".',
          },
        });
        break;
      }

      default:
        cards.push({
          type: 'info',
          title: 'Command Received',
          data: { message: 'Processed command.' },
        });
    }
  } catch (error: any) {
    cards.push({
      type: 'error',
      title: 'Execution Error',
      data: { message: error.message || 'An error occurred while executing the intent.' },
    });
  }

  return cards;
}
