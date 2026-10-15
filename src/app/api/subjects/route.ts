import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const subjects = await db.subject.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { studySets: true } } },
    });
    return NextResponse.json({ subjects });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color = 'violet', icon = 'BookOpen' } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const subject = await db.subject.create({
      data: { name: name.trim(), color, icon },
      include: { _count: { select: { studySets: true } } },
    });
    return NextResponse.json({ subject });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
