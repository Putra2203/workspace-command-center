import { NextRequest } from 'next/server';
import { ActionPlanSchema } from '@/types/schemas';
import { ActionPlan, ActionCard } from '@/types/ai';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';
import { prisma } from '@/infrastructure/db/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan } = body;

    const validation = ActionPlanSchema.safeParse(plan);
    if (!validation.success) {
      return Response.json(
        { error: 'Invalid ActionPlan format', details: validation.error.format() },
        { status: 400 }
      );
    }

    const validPlan: ActionPlan = validation.data;
    const currentUser = await getCurrentUserContext(planeService);
    const userId = currentUser?.userId || 'anonymous';

    const actionCards: ActionCard[] = [];
    let successCount = 0;
    let failCount = 0;
    const stepResults: any[] = [];

    for (const step of validPlan.steps) {
      try {
        if (step.operation === 'createIssue') {
          const realProjectId = await planeService.resolveProjectId(step.target);
          const created = await planeService.createIssue(realProjectId, step.changes as Record<string, any>);
          actionCards.push({
            type: 'issue_created',
            title: `Task "${created.name}" berhasil dibuat`,
            data: {
              id: created.id,
              key: `${step.target}-${created.sequence_id}`,
              title: created.name,
              assignee: currentUser?.name || 'Unassigned',
            },
          });
          stepResults.push({ step: step.operation, target: step.target, success: true, id: created.id });
          successCount++;
        } else if (step.operation === 'updateIssue') {
          const projectKeyMatch = step.target.match(/^([A-Z0-9]+)-\d+/i);
          const projectKey = projectKeyMatch ? projectKeyMatch[1] : step.target;
          const realProjectId = await planeService.resolveProjectId(projectKey);
          const realIssueId = await planeService.resolveIssueId(realProjectId, step.target);

          const updatePayload: Record<string, any> = {};
          if (step.changes.priority) {
            updatePayload.priority = step.changes.priority;
          }
          if (step.changes.state && typeof step.changes.state === 'string') {
            const realStateId = await planeService.resolveStateId(realProjectId, step.changes.state);
            updatePayload.state = realStateId;
          }

          const updated = await planeService.updateIssue(realProjectId, realIssueId, updatePayload);
          actionCards.push({
            type: 'issue_updated',
            title: `Task ${step.target} berhasil diperbarui`,
            message: `Task ${step.target} telah diperbarui di Plane.`,
            data: updated,
          });
          stepResults.push({ step: step.operation, target: step.target, success: true });
          successCount++;
        }
      } catch (stepErr: any) {
        console.error(`Execution failed for step ${step.operation} on ${step.target}:`, stepErr);
        failCount++;
        stepResults.push({ step: step.operation, target: step.target, success: false, error: stepErr.message });
      }
    }

    if (validPlan.intent === 'batch_create_issues' && successCount > 0) {
      actionCards.unshift({
        type: 'batch_issues_created',
        title: `${successCount} Task Berhasil Dibuat`,
        message: `${successCount} task baru telah ditambahkan ke project Plane.`,
        data: {
          count: successCount,
          items: actionCards.map(c => ({ key: c.data.key, title: c.data.title })),
        },
      });
    }

    // Record audit log entry in Supabase Postgres via Prisma
    let auditLogId: string | undefined;
    try {
      const audit = await prisma.actionPlanAuditLog.create({
        data: {
          userId,
          intent: validPlan.intent,
          summary: validPlan.summary,
          risk: validPlan.risk,
          stepsJson: validPlan.steps as any,
          resultJson: stepResults as any,
          successCount,
          failCount,
        },
      });
      auditLogId = audit.id;
    } catch (auditErr) {
      console.warn('Failed to write action plan audit log:', auditErr);
    }

    return Response.json({
      success: failCount === 0,
      reply: `Rencana tindakan "${validPlan.summary}" telah dieksekusi (${successCount} sukses, ${failCount} gagal).`,
      actionCards,
      auditLogId,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/execute:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
