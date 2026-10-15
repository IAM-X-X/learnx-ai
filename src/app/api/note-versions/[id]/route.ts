import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/note-versions/[id] — get a specific note version's full content.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const version = await db.noteVersion.findUnique({ where: { id } });
    if (!version) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({
      version: {
        ...version,
        createdAt: version.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/note-versions/[id] — restore a note version (sets it as the current notes).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const version = await db.noteVersion.findUnique({ where: { id } });
    if (!version) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Snapshot the current notes before restoring (if different)
    const set = await db.studySet.findUnique({ where: { id: version.studySetId } });
    if (set && set.notes && set.notes.trim().length > 0 && set.notes !== version.notes) {
      await db.noteVersion.create({
        data: {
          studySetId: version.studySetId,
          notes: set.notes,
          difficulty: version.difficulty,
          length: version.length,
          language: version.language,
        },
      });
    }

    const updated = await db.studySet.update({
      where: { id: version.studySetId },
      data: { notes: version.notes },
    });

    if (body.logActivity !== false) {
      await db.studyActivity.create({
        data: {
          studySetId: version.studySetId,
          type: 'notes',
          detail: 'Restored a note version',
        },
      });
    }

    return NextResponse.json({ studySet: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.noteVersion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
