import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  // If sessionId is provided, return messages for that session
  if (sessionId) {
    try {
      if (!prisma || !(prisma as any).chatMessage) {
        return Response.json({ messages: [], fallback: true });
      }
      const messages = await (prisma as any).chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      return Response.json({ messages });
    } catch (error) {
      console.warn('Failed to fetch chat messages from DB:', error);
      return Response.json({ messages: [], fallback: true });
    }
  }

  // Otherwise return session list (excluding empty phantom sessions)
  try {
    if (!prisma || !(prisma as any).chatSession) {
      return Response.json({ sessions: [], fallback: true });
    }

    // Auto-prune old ghost sessions with 0 messages in the background
    (prisma as any).chatSession.deleteMany({
      where: {
        messages: { none: {} },
      },
    }).catch(() => {});

    // Only return sessions that have at least 1 message
    const sessions = await (prisma as any).chatSession.findMany({
      where: {
        messages: { some: {} },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    });
    return Response.json({ sessions });
  } catch (error) {
    console.warn('Failed to fetch chat sessions from DB, returning empty:', error);
    return Response.json({ sessions: [], fallback: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!prisma || !(prisma as any).chatSession) {
      return Response.json({
        session: { id: `local-${Date.now()}`, title: 'New Conversation', fallback: true },
        fallback: true,
      });
    }
    const body = await request.json().catch(() => ({}));
    const session = await (prisma as any).chatSession.create({
      data: {
        title: body.title || 'New Conversation',
        projectId: body.projectId || null,
      },
    });
    return Response.json({ session });
  } catch (error) {
    console.warn('Failed to create chat session in DB, returning fallback:', error);
    return Response.json({
      session: { id: `local-${Date.now()}`, title: 'New Conversation', fallback: true },
      fallback: true,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, role, content, actionCards, plan, imageUrl } = body;

    if (!sessionId || !role || !content) {
      return Response.json({ error: 'sessionId, role, and content are required' }, { status: 400 });
    }

    // Skip DB persist for local fallback sessions or uninitialized prisma
    if (sessionId.startsWith('local-') || !prisma || !(prisma as any).chatMessage) {
      return Response.json({ message: { id: `local-msg-${Date.now()}`, fallback: true } });
    }

    const message = await (prisma as any).chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        actionCards: actionCards || undefined,
        plan: plan || undefined,
        imageUrl: imageUrl || undefined,
      },
    });

    // Auto-update session title from first user message if still default
    if (role === 'user' && (prisma as any).chatSession) {
      const msgCount = await (prisma as any).chatMessage.count({ where: { sessionId } });
      if (msgCount === 1) {
        await (prisma as any).chatSession.update({
          where: { id: sessionId },
          data: { title: content.slice(0, 80) },
        });
      }
    }

    return Response.json({ message });
  } catch (error) {
    console.warn('Failed to persist chat message to DB:', error);
    return Response.json({ message: { id: `local-msg-${Date.now()}`, fallback: true } });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      const body = await request.json().catch(() => ({}));
      sessionId = body.sessionId;
    }

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Explicitly delete messages first to guarantee no foreign key errors, then delete session
    if (!sessionId.startsWith('local-') && prisma) {
      if ((prisma as any).chatMessage) {
        await (prisma as any).chatMessage.deleteMany({
          where: { sessionId },
        }).catch((e: any) => console.warn('Could not delete messages for session:', e));
      }
      if ((prisma as any).chatSession) {
        await (prisma as any).chatSession.delete({
          where: { id: sessionId },
        });
      }
    }

    return Response.json({ success: true, deletedId: sessionId });
  } catch (error: any) {
    console.error('Failed to delete chat session from DB:', error);
    return Response.json({ error: error.message || 'Failed to delete session' }, { status: 500 });
  }
}
