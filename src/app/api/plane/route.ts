import { NextRequest } from 'next/server';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { ProjectService } from '@/application/services/ProjectService';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const projectId = searchParams.get('projectId');
  const issueId = searchParams.get('issueId');

  const projectService = new ProjectService(planeService);

  try {
    switch (action) {
      case 'getMe': {
        const data = await planeService.getMe();
        return Response.json(data);
      }
      case 'listProjects': {
        const data = await projectService.listProjects();
        return Response.json(data);
      }
      case 'getProject': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.getProject(projectId);
        return Response.json(data);
      }
      case 'listStates': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const bypassCache = searchParams.get('bypassCache') === 'true';
        const data = await planeService.listStates(projectId, bypassCache);
        return Response.json(data);
      }
      case 'listMembers': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listMembers(projectId);
        return Response.json(data);
      }
      case 'listIssues': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listIssues(projectId);
        return Response.json(data);
      }
      case 'getIssue': {
        if (!projectId || !issueId) return Response.json({ error: 'Missing projectId or issueId' }, { status: 400 });
        const data = await planeService.getIssue(projectId, issueId);
        return Response.json(data);
      }
      case 'listLabels': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listLabels(projectId);
        return Response.json(data);
      }
      case 'listComments': {
        if (!projectId || !issueId) return Response.json({ error: 'Missing projectId or issueId' }, { status: 400 });
        const data = await planeService.listComments(projectId, issueId);
        return Response.json(data);
      }
      case 'listCycles': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listCycles(projectId);
        return Response.json(data);
      }
      case 'listCycleIssues': {
        const cycleId = searchParams.get('cycleId');
        if (!projectId || !cycleId) return Response.json({ error: 'Missing projectId or cycleId' }, { status: 400 });
        try {
          const data = await planeService.listCycleIssues(projectId, cycleId);
          return Response.json(data);
        } catch (err) {
          console.error('API Route listCycleIssues error:', err);
          return Response.json([]);
        }
      }
      case 'listModules': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listModules(projectId);
        return Response.json(data);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const appError = AppError.fromUnknown(error);
    console.error('Plane API GET Error:', appError.code, appError.message);
    return Response.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.httpStatus }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'createIssue': {
        const targetProjectId = body.projectId || searchParams.get('projectId');
        if (!targetProjectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const { projectId: _p, ...data } = body;
        const issue = await planeService.createIssue(targetProjectId, data);
        return Response.json(issue);
      }
      case 'addComment': {
        const { projectId, issueId, comment_html } = body;
        if (!projectId || !issueId || !comment_html) {
          return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const comment = await planeService.addComment(projectId, issueId, comment_html);
        return Response.json(comment);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const appError = AppError.fromUnknown(error);
    console.error('Plane API POST Error:', appError.code, appError.message);
    return Response.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.httpStatus }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'updateIssue': {
        const targetProjectId = body.projectId || searchParams.get('projectId');
        const targetIssueId = body.issueId || searchParams.get('issueId');
        if (!targetProjectId || !targetIssueId) {
          return Response.json({ error: 'Missing projectId or issueId' }, { status: 400 });
        }
        const { projectId: _p, issueId: _i, ...data } = body;
        const issue = await planeService.updateIssue(targetProjectId, targetIssueId, data);
        return Response.json(issue);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const appError = AppError.fromUnknown(error);
    console.error('Plane API PATCH Error:', appError.code, appError.message);
    return Response.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.httpStatus }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const projectId = searchParams.get('projectId');
  const issueId = searchParams.get('issueId');

  try {
    switch (action) {
      case 'deleteIssue': {
        if (!projectId || !issueId) {
          return Response.json({ error: 'Missing projectId or issueId' }, { status: 400 });
        }
        const result = await planeService.deleteIssue(projectId, issueId);
        return Response.json(result);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const appError = AppError.fromUnknown(error);
    console.error('Plane API DELETE Error:', appError.code, appError.message);
    return Response.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.httpStatus }
    );
  }
}
