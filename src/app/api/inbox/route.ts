import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';
import { planeService } from '@/infrastructure/plane/PlaneClient';
import { getCurrentUserContext } from '@/lib/context/current-user';

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext(planeService);
    const userId = currentUser?.userId || 'anonymous';

    const items = await prisma.inboxItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ items });
  } catch (error: any) {
    console.error('Error fetching inbox items:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== 'string') {
      return Response.json({ error: 'Valid rawText string is required' }, { status: 400 });
    }

    const currentUser = await getCurrentUserContext(planeService);
    const userId = currentUser?.userId || 'anonymous';

    const item = await prisma.inboxItem.create({
      data: {
        userId,
        rawText: rawText.trim(),
        status: 'pending',
      },
    });

    return Response.json({ item });
  } catch (error: any) {
    console.error('Error creating inbox item:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
