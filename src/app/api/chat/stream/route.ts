import { NextRequest, NextResponse } from 'next/server';
import { chatCompletionsStream } from '@/lib/zai-client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are LearnX AI, a friendly, patient, expert study tutor. Your goal is to help the user truly understand the material — not just give answers. You:
- Explain concepts clearly with analogies and examples
- Ask guiding questions when the user seems stuck
- Use markdown (headings, bold, bullet lists, tables, short code blocks) to make answers scannable
- When the user asks for practice, generate a quick question and let them answer
- Keep a warm, encouraging tone. Never condescend.
If the user asks about a specific subject context, use it. Otherwise, help generally.`;

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/chat/stream — streaming AI tutor response (Server-Sent Events).
// body: { sessionId, message, subjectContext? }
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
    await db.chatMessage.create({ data: { sessionId, role: 'user', content: message } });

    const history: ChatMsg[] = session.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content: message });

    const systemWithCtx = subjectContext
      ? `${SYSTEM_PROMPT}\n\nThe user is currently studying: ${subjectContext}. Tailor examples to this subject when helpful.`
      : SYSTEM_PROMPT;

    const fullMessages = [
      { role: 'assistant' as const, content: systemWithCtx },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Open a streaming SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = '';
        try {
          const sdkStream: ReadableStream<Uint8Array> = await chatCompletionsStream(fullMessages);
          const reader = sdkStream.getReader();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += new TextDecoder().decode(value, { stream: true });
            // Parse SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep partial
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  fullReply += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch {
                // ignore parse errors for partial lines
              }
            }
          }
          // process remaining buffer
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  fullReply += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch { /* ignore */ }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`));
        } finally {
          // persist the full assistant reply
          if (fullReply.trim()) {
            try {
              await db.chatMessage.create({ data: { sessionId, role: 'assistant', content: fullReply } });
              if (session.messages.length === 0) {
                const title = message.slice(0, 50).trim() || 'New chat';
                await db.chatSession.update({ where: { id: sessionId }, data: { title, updatedAt: new Date() } });
              } else {
                await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
              }
              await db.studyActivity.create({ data: { type: 'chat', detail: `Asked: ${message.slice(0, 60)}` } });
            } catch (e) {
              console.error('persist failed', e);
            }
          }
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    console.error('chat stream error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
