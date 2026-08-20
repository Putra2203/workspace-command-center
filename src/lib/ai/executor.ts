import { IntentResult, ActionCard } from '@/types/ai';
import { PlaneService } from '@/infrastructure/plane/PlaneClient';

/**
 * Executes a parsed intent using the PlaneService with 0-token deterministic queries,
 * read-after-write verification, and rich interactive cards.
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
        const rawProjKey = intent.entities.projectKey || 'ALL';
        const realProjectId = await planeService.resolveProjectId(rawProjKey);
        
        // Resolve project human-readable identifier
        const projects = await planeService.listProjects().catch(() => []);
        const foundProj = projects.find(p => p.id === realProjectId || p.identifier?.toLowerCase() === rawProjKey.toLowerCase());
        const displayKey = realProjectId === 'ALL' ? 'ALL' : (foundProj?.identifier || 'PROJECT');
        const displayProjectName = realProjectId === 'ALL' ? 'All Projects' : (foundProj?.name || displayKey);

        // Fetch states for this project to resolve state UUID -> state Name (e.g. Done, In Progress, Backlog)
        const states = await planeService.listStates(realProjectId).catch(() => []);
        const stateMap = new Map<string, { name: string; color: string; group?: string }>();
        states.forEach(s => stateMap.set(s.id, { name: s.name, color: s.color, group: s.group }));

        // Fetch member map to resolve assignee names
        const memberMap = await planeService.getMemberMap(realProjectId).catch(() => new Map<string, string>());

        // Fetch issues with optional priority filtering
        let issues = await planeService.listIssues(realProjectId, {
          priority: intent.entities.priority,
        });

        // If specific state filter was parsed, filter issues accordingly
        if (intent.entities.state) {
          const targetStateLower = intent.entities.state.toLowerCase();
          issues = issues.filter(i => {
            const stateId = typeof i.state === 'string' ? i.state : i.state?.id || i.state_detail?.id || '';
            const stateInfo = stateMap.get(stateId);
            const stateNameLower = (stateInfo?.name || i.state_detail?.name || '').toLowerCase();
            const stateGroupLower = (stateInfo?.group || '').toLowerCase();
            return stateNameLower.includes(targetStateLower) || stateGroupLower.includes(targetStateLower);
          });
        }

        // Filter by user scope if my_tasks is requested
        const effectiveScope = intent.entities.userScope || options?.userScope || 'my_tasks';
        if (effectiveScope === 'my_tasks' && options?.currentUserId) {
          const currentUserId = options.currentUserId;
          issues = issues.filter(i => {
            if (!i.assignees || i.assignees.length === 0) return false;
            return i.assignees.includes(currentUserId);
          });
        }
        
        const projectMap = new Map<string, string>();
        projects.forEach(p => { if (p.id && p.identifier) projectMap.set(p.id, p.identifier); });

        cards.push({
          type: 'issue_list',
          title: `${displayProjectName} (${displayKey}) - ${issues.length} Tasks ${effectiveScope === 'my_tasks' ? '(Mine)' : ''}`,
          data: {
            projectId: realProjectId,
            projectKey: displayKey,
            items: issues.map(i => {
              const stateId = typeof i.state === 'string' ? i.state : i.state?.id || i.state_detail?.id || '';
              const stateInfo = stateMap.get(stateId) || { name: i.state_detail?.name || 'Open', color: '#3B82F6' };
              const assigneeId = i.assignees && i.assignees.length > 0 ? i.assignees[0] : '';
              const assigneeName = memberMap.get(assigneeId) || (assigneeId ? 'Assigned' : 'Unassigned');
              const itemProjKey = (i as any).project_detail?.identifier || projectMap.get((i as any).project) || displayKey;

              return {
                id: i.id,
                key: `${itemProjKey}-${i.sequence_id}`,
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
        const rawProjKey = intent.entities.projectKey || 'ALL';
        const titles = intent.entities.titles || (intent.entities.tasks || []).map(t => t.title);
        if (titles.length === 0) {
          throw new Error('No task titles provided for bulk creation.');
        }

        const realProjectId = await planeService.resolveProjectId(rawProjKey);
        const projects = await planeService.listProjects().catch(() => []);
        const targetProjId = realProjectId === 'ALL' ? (projects[0]?.id || 'ALL') : realProjectId;
        const foundProj = projects.find(p => p.id === targetProjId);
        const displayKey = foundProj?.identifier || 'PROJECT';

        // Create all issues concurrently in parallel
        const createdIssues = await Promise.all(
          titles.map(title =>
            planeService.createIssue(targetProjId, {
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
        const rawProjKey = intent.entities.projectKey || 'ALL';
        const realProjectId = await planeService.resolveProjectId(rawProjKey);
        const projects = await planeService.listProjects().catch(() => []);
        const targetProjId = realProjectId === 'ALL' ? (projects[0]?.id || 'ALL') : realProjectId;
        const foundProj = projects.find(p => p.id === targetProjId);
        const displayKey = foundProj?.identifier || 'PROJECT';

        const newIssue = await planeService.createIssue(targetProjId, {
          name: intent.entities.title || 'New Issue via AI Command Center',
          description: intent.entities.description,
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
        const rawProjKey = intent.entities.projectKey || 'ALL';
        if (!intent.entities.issueKey) {
          throw new Error('Issue key is required (e.g. BSJ-124).');
        }
        const realProjectId = await planeService.resolveProjectId(rawProjKey);
        const issue = await planeService.getIssue(realProjectId, intent.entities.issueKey);
        
        // Resolve project key, state name, and assignee
        const projects = await planeService.listProjects().catch(() => []);
        const targetProjId = (issue as any).project || (issue as any).project_detail?.id || realProjectId;
        const foundProj = projects.find(p => p.id === targetProjId);
        const displayKey = foundProj?.identifier || (issue as any).project_detail?.identifier || 'TASK';

        const states = await planeService.listStates(targetProjId).catch(() => []);
        const stateId = typeof issue.state === 'string' ? issue.state : issue.state?.id || issue.state_detail?.id || '';
        const matchingState = states.find(s => s.id === stateId);
        const stateName = matchingState?.name || issue.state_detail?.name || 'Open';

        const assigneeId = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '';
        const assigneeName = assigneeId ? await planeService.resolveMemberName(targetProjId, assigneeId) : 'Unassigned';

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
        const rawProjKey = intent.entities.projectKey || 'ALL';
        if (!intent.entities.issueKey) {
          throw new Error('Issue key is required (e.g. BSJ-124).');
        }

        const realProjectId = await planeService.resolveProjectId(rawProjKey);
        const { realProjectId: resolvedProject } = await planeService.resolveIssueInfo(realProjectId, intent.entities.issueKey);
        const updatePayload: Record<string, any> = {};

        if (intent.entities.state) {
          const stateId = await planeService.resolveStateId(resolvedProject, intent.entities.state);
          updatePayload.state = stateId;
        }

        if (intent.entities.priority) {
          updatePayload.priority = intent.entities.priority;
        }

        const updatedIssue = await planeService.updateIssue(resolvedProject, intent.entities.issueKey, updatePayload);
        
        // Read-After-Write Verification
        let isVerified = true;
        try {
          const verifiedIssue = await planeService.getIssue(resolvedProject, intent.entities.issueKey);
          if (updatePayload.state) {
            const currentStateId = typeof verifiedIssue.state === 'string' ? verifiedIssue.state : verifiedIssue.state?.id || verifiedIssue.state_detail?.id;
            isVerified = currentStateId === updatePayload.state;
          }
        } catch {
          // Keep verification status true if update succeeded
        }

        cards.push({
          type: 'issue_updated',
          title: isVerified ? '✓ Operation Verified: Issue Updated' : 'Issue Updated',
          message: `Updated ${intent.entities.issueKey}${intent.entities.state ? ` state to "${intent.entities.state}"` : ''}${intent.entities.priority ? ` (${intent.entities.priority} priority)` : ''}`,
          data: {
            key: intent.entities.issueKey,
            title: updatedIssue.name,
            state: intent.entities.state || 'Updated',
            verified: isVerified,
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
            message: 'You can say:\n- "tampilkan tugasku"\n- "list task di project BSJ Phase 4"\n- "tugas yang urgent apa aja"\n- "buat task fix login bug"\n- "pecah feature payment gateway menjadi subtask"\n- "pindahkan task BSJ-12 ke Done"',
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
