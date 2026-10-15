import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMultiTurn } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are LearnX AI, a friendly, patient, expert study tutor. Your goal is to help the user truly understand the material — not just give answers. You:
- Explain concepts clearly with analogies and examples
- Ask guiding questions when the user seems stuck
- Use markdown (headings, bold, bullet lists, tables, short code blocks) to make answers scannable
- When the user asks for practice, generate a quick question and let them answer
- Keep a warm, encouraging tone. Never condescend.
If the user asks about a specific subject context, use it. Otherwise, help generally.`;

// POST /api/chat/message
// body: { sessionId: string, message: string, subjectContext?: string }
export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, subjectContext } = await req.json();
    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
    }

    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

    // persist the user message
    await db.chatMessage.create({
      data: { sessionId, role: 'user', content: message },
    });

    const history = session.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content: message });

    const systemWithCtx = subjectContext
      ? `${SYSTEM_PROMPT}\n\nThe user is currently studying: ${subjectContext}. Tailor examples to this subject when helpful.`
      : SYSTEM_PROMPT;

    const reply = await chatMultiTurn(history, systemWithCtx);

    await db.chatMessage.create({
      data: { sessionId, role: 'assistant', content: reply },
    });

    // auto-title the session on first message
    if (session.messages.length === 0) {
      const title = message.slice(0, 50).trim() || 'New chat';
      await db.chatSession.update({
        where: { id: sessionId },
        data: { title, updatedAt: new Date() },
      });
    } else {
      await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    }

    await db.studyActivity.create({
      data: { type: 'chat', detail: `Asked: ${message.slice(0, 60)}` },
    });

    return NextResponse.json({ reply, sessionId });
  } catch (e) {
    console.error('chat error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
