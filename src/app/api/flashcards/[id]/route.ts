import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/flashcards/[id] — edit a flashcard's front/back.
// body: { front?: string, back?: string }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.front === 'string') data.front = body.front.trim();
    if (typeof body.back === 'string') data.back = body.back.trim();
    const updated = await db.flashcard.update({ where: { id }, data });
    return NextResponse.json({ flashcard: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/flashcards/[id] — create a new flashcard (id is the studySetId here).
// We use a separate route below; this is kept for completeness.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.flashcard.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
