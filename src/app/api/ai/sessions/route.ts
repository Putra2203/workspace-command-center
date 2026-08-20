import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/client';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  // If sessionId is provided, return messages for that session
  if (sessionId) {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      return Response.json({ messages });
    } catch (error) {
      console.warn('Failed to fetch chat messages from DB:', error);
      return Response.json({ messages: [], fallback: true });
    }
  }

  // Otherwise return session list
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
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
    const body = await request.json().catch(() => ({}));
    const session = await prisma.chatSession.create({
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

    // Skip DB persist for local fallback sessions
    if (sessionId.startsWith('local-')) {
      return Response.json({ message: { id: `local-msg-${Date.now()}`, fallback: true } });
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        actionCards: actionCards || undefined,
        plan: plan || undefined,
        imageUrl: imageUrl || undefined,
      },
    });

    // Auto-update session title from first user message
    if (role === 'user') {
      const msgCount = await prisma.chatMessage.count({ where: { sessionId } });
      if (msgCount === 1) {
        await prisma.chatSession.update({
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
