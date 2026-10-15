import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/study-sets/[id]/share — create (or return existing) a share token.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const set = await db.studySet.findUnique({ where: { id }, select: { shareToken: true } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    if (set.shareToken) {
      return NextResponse.json({ token: set.shareToken, url: `/shared/${set.shareToken}` });
    }
    // generate a short token
    const token = generateToken();
    await db.studySet.update({ where: { id }, data: { shareToken: token } });
    return NextResponse.json({ token, url: `/shared/${token}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/study-sets/[id]/share — revoke sharing.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.studySet.update({ where: { id }, data: { shareToken: null } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 12; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}
