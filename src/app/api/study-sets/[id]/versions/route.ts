import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/study-sets/[id]/versions — list note-version snapshots for a study set.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const versions = await db.noteVersion.findMany({
      where: { studySetId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        difficulty: true,
        length: true,
        language: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      versions: versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
