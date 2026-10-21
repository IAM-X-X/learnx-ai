import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSummary } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/study-sets/[id]/summary — generate a TL;DR summary.
// body: { style: 'brief' | 'standard' | 'detailed' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const style = (body.style as 'brief' | 'standard' | 'detailed') || 'standard';

    const set = await db.studySet.findUnique({ where: { id } });
    if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const source = [set.notes, set.sourceContent].filter(Boolean).join('\n\n') || set.sourceContent;
    let summary;
    try {
      summary = await generateSummary({ source, style });
    } catch (aiErr) {
      console.error('AI call failed:', aiErr);
      return NextResponse.json(
        {
          error: 'AI service unavailable.',
          reason:
            process.env.VERCEL === '1' && !process.env.GROQ_API_KEY
              ? 'On Vercel, set GROQ_API_KEY env var (free at https://console.groq.com/keys). See /settings → AI Engine Status.'
              : (aiErr as Error).message,
        },
        { status: 503 },
      );
    }

    await db.studyActivity.create({
      data: { studySetId: id, type: 'study', detail: `Generated summary (${style})` },
    });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error('summary generation error', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
