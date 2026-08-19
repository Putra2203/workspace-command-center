import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';
import { ActionPlan } from '@/types/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { projectId } = body;

    const item = await prisma.inboxItem.findUnique({
      where: { id },
    });

    if (!item) {
      return Response.json({ error: 'Inbox item not found' }, { status: 404 });
    }

    const targetProject = projectId || 'PROJECT';
    const title = item.rawText.split('\n')[0].substring(0, 80);

    const plan: ActionPlan = {
      id: `plan_triage_${item.id}`,
      intent: 'create_issue',
      summary: `Konversi catatan inbox "${title}" menjadi task Plane di project ${targetProject}`,
      risk: 'low',
      requiresApproval: true,
      steps: [
        {
          operation: 'createIssue',
          target: targetProject,
          changes: {
            title,
            description: item.rawText,
            priority: 'medium',
          },
        },
      ],
    };

    const updatedItem = await prisma.inboxItem.update({
      where: { id },
      data: { status: 'triaged' },
    });

    return Response.json({
      item: updatedItem,
      plan,
    });
  } catch (error: any) {
    console.error('Error triaging inbox item:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
