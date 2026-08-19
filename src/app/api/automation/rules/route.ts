import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext(planeService);
    const userId = currentUser?.userId || 'anonymous';

    const rules = await prisma.automationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ rules });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, trigger, action, enabled } = body;

    if (!name || !trigger || !action) {
      return Response.json({ error: 'name, trigger, and action are required' }, { status: 400 });
    }

    const currentUser = await getCurrentUserContext(planeService);
    const userId = currentUser?.userId || 'anonymous';

    const rule = await prisma.automationRule.create({
      data: {
        userId,
        name: name.trim(),
        trigger: trigger.trim(),
        action: action.trim(),
        enabled: enabled ?? true,
      },
    });

    return Response.json({ rule });
  } catch (error: any) {
    console.error('Error creating automation rule:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
