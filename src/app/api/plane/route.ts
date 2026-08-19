import { NextRequest } from 'next/server';
import { PlaneService } from '@/infrastructure/plane/PlaneClient';
import { ProjectService } from '@/application/services/ProjectService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const projectId = searchParams.get('projectId');
  const issueId = searchParams.get('issueId');

  const planeService = new PlaneService();
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
        const data = await planeService.listStates(projectId);
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
      case 'listModules': {
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const data = await planeService.listModules(projectId);
        return Response.json(data);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Plane API GET Error:', error.message);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: error.response?.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const planeService = new PlaneService();

  try {
    const body = await request.json();

    switch (action) {
      case 'createIssue': {
        const { projectId, ...data } = body;
        if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        const issue = await planeService.createIssue(projectId, data);
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
  } catch (error: any) {
    console.error('Plane API POST Error:', error.message);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: error.response?.status || 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const planeService = new PlaneService();

  try {
    const body = await request.json();

    switch (action) {
      case 'updateIssue': {
        const { projectId, issueId, ...data } = body;
        if (!projectId || !issueId) {
          return Response.json({ error: 'Missing projectId or issueId' }, { status: 400 });
        }
        const issue = await planeService.updateIssue(projectId, issueId, data);
        return Response.json(issue);
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Plane API PATCH Error:', error.message);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: error.response?.status || 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const projectId = searchParams.get('projectId');
  const issueId = searchParams.get('issueId');

  const planeService = new PlaneService();

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
  } catch (error: any) {
    console.error('Plane API DELETE Error:', error.message);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: error.response?.status || 500 });
  }
}
