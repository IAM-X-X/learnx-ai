// AI helper library for LearnX AI
// All functions use z-ai-web-dev-sdk (server-side only).

import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/** Call the LLM with a system + user message and return the text. */
export async function chatComplete(system: string, user: string): Promise<string> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: 'disabled' },
  });
  const content = completion.choices[0]?.message?.content ?? '';
  return content.trim();
}

/** Multi-turn chat given prior messages (role/content). */
export async function chatMultiTurn(
  messages: { role: 'user' | 'assistant'; content: string }[],
  system: string,
): Promise<string> {
  const zai = await getZAI();
  const fullMessages = [
    { role: 'assistant' as const, content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const completion = await zai.chat.completions.create({
    messages: fullMessages,
    thinking: { type: 'disabled' },
  });
  return (completion.choices[0]?.message?.content ?? '').trim();
}

/** Generate structured Markdown study notes from source content / a topic. */
export async function generateNotes(opts: {
  title: string;
  source: string; // text, paste, or topic description
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  length: 'brief' | 'standard' | 'detailed';
  language?: string; // e.g. 'en', 'es', 'fr', 'de', 'zh', 'ja', ...
}): Promise<string> {
  const lengthMap = {
    brief: '~400 words, concise bullet-style',
    standard: '~800 words, balanced depth',
    detailed: '~1400 words, comprehensive with examples',
  };
  const langInstruction = opts.language && opts.language !== 'en'
    ? `\nIMPORTANT: Write ALL the notes in this language: ${languageName(opts.language)}. Keep technical terms accurate.`
    : '';
  const system =
    'You are LearnX AI, an expert study-notes author. You write clear, well-structured Markdown study notes that help students actually learn. Use headings (##), bullet points, numbered lists, bold key terms, tables where useful, and short code blocks if relevant. Never start with a heading line like "# Notes". End with a "## Key Takeaways" section of 3-5 bullets.';
  const user = `Create ${opts.length === 'detailed' ? 'detailed' : opts.length} study notes for the topic/material below.

Title: ${opts.title}
Target audience: ${opts.difficulty} level students
Length: ${lengthMap[opts.length]}
${langInstruction}

Source material / topic:
"""
${opts.source.slice(0, 8000)}
"""

Return ONLY the Markdown notes (no preamble, no code fences around the whole thing).`;
  return chatComplete(system, user);
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  pl: 'Polish',
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

/** Generate flashcards from source content. Returns array of {front, back}. */
export async function generateFlashcards(opts: {
  source: string;
  count: number;
}): Promise<GeneratedFlashcard[]> {
  const system =
    'You are LearnX AI, a flashcard generator. You output STRICT JSON only — no prose, no markdown fences. The JSON shape is {"cards":[{"front":"question or prompt","back":"concise answer"}]}. Front should be a clear prompt (term, question, or fill-in-the-blank). Back should be a concise but complete answer (1-3 sentences).';
  const user = `Generate ${opts.count} high-quality flashcards from this material. Vary question styles (definition, "why", "how", fill-in-the-blank).

Material:
"""
${opts.source.slice(0, 8000)}
"""

Return JSON: {"cards":[{"front":"...","back":"..."}]}`;
  const raw = await chatComplete(system, user);
  return parseJsonLoose<GeneratedFlashcard[]>(raw, 'cards') ?? [];
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type?: 'multiple_choice' | 'true_false';
}

export interface GeneratedSummary {
  tldr: string;
  keyPoints: string[];
  keyTerms: { term: string; definition: string }[];
  questionsForSelf: string[];
  estimatedMinutes: number;
}

/** Generate a structured TL;DR summary (key points + glossary + self-check questions). */
export async function generateSummary(opts: {
  source: string;
  style: 'brief' | 'standard' | 'detailed';
}): Promise<GeneratedSummary> {
  const system =
    'You are LearnX AI, an expert summarizer. You output STRICT JSON only — no prose, no markdown fences. Shape: {"tldr":"2-4 sentence overview","keyPoints":["...","..."],"keyTerms":[{"term":"...","definition":"..."}],"questionsForSelf":["...","..."],"estimatedMinutes":10}. tldr should be plain text (no markdown). keyPoints are short single-line bullets. keyTerms are 4-8 important vocabulary terms with crisp definitions. questionsForSelf are 3-5 reflective questions the learner should be able to answer after studying.';
  const styleMap = {
    brief: 'brief: ~3 key points, ~4 key terms, ~3 self-questions, tldr 2 sentences',
    standard: 'standard: ~5 key points, ~6 key terms, ~4 self-questions, tldr 3 sentences',
    detailed: 'detailed: ~8 key points, ~8 key terms, ~5 self-questions, tldr 4 sentences',
  };
  const user = `Create a ${styleMap[opts.style]} summary of this material. Estimate realisticMinutes as the reading time for the full material.

Material:
"""
${opts.source.slice(0, 8000)}
"""

Return JSON: {"tldr":"...","keyPoints":[...],"keyTerms":[{"term":"...","definition":"..."}],"questionsForSelf":[...],"estimatedMinutes":N}`;
  const raw = await chatComplete(system, user);
  const parsed = parseJsonLoose<GeneratedSummary>(raw);
  if (!parsed) {
    return {
      tldr: 'Summary generation failed. Please try again.',
      keyPoints: [],
      keyTerms: [],
      questionsForSelf: [],
      estimatedMinutes: 5,
    };
  }
  return parsed;
}

/** Generate a quiz from source content. */
export async function generateQuiz(opts: {
  source: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mixTypes: boolean; // include some true/false
}): Promise<GeneratedQuizQuestion[]> {
  const system =
    'You are LearnX AI, a quiz generator. You output STRICT JSON only — no prose, no markdown fences. Shape: {"questions":[{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"why"}]}. Multiple choice options must be 4 items. For true_false use type "true_false" with options ["True","False"] and correctIndex 0 or 1. Explanations should be 1-2 sentences.';
  const user = `Generate ${opts.count} quiz questions from this material. Difficulty: ${opts.difficulty}. ${
    opts.mixTypes ? 'Mix ~70% multiple choice and ~30% true/false.' : 'All multiple choice.'
  }

Material:
"""
${opts.source.slice(0, 8000)}
"""

Return JSON: {"questions":[...]}`;
  const raw = await chatComplete(system, user);
  return parseJsonLoose<GeneratedQuizQuestion[]>(raw, 'questions') ?? [];
}

/** Generate a podcast-style script (two hosts: Alex & Sam) from notes. */
export async function generatePodcastScript(opts: {
  title: string;
  notes: string;
}): Promise<string> {
  const system =
    'You are LearnX AI, a podcast scriptwriter for an educational show. Write an engaging conversational script between two hosts: "Alex" (curious learner) and "Sam" (expert teacher). Format each speaker change as a new line starting with "Alex: " or "Sam: " (exactly that format, no quotes). Do NOT write the speaker name as a standalone line — always put it as "Name: their dialogue". Keep it lively, use analogies, real-world examples, and a recap near the end. Do not use markdown headings or stage directions.';
  const user = `Write a ~4-6 minute study podcast script on the topic below. Use only the two hosts (Alex and Sam). Start with a brief hook from Sam. End with a 3-bullet recap from Sam.

Title: ${opts.title}

Notes / source material:
"""
${opts.notes.slice(0, 6000)}
"""

Return only the script. Each line must start with either "Sam: " or "Alex: ".`;
  return chatComplete(system, user);
}

/** TTS: split long text into <=1000 char chunks and synthesize each, concat WAV buffers. */
export async function synthesizeSpeechChunks(
  text: string,
  voice: string = 'jam',
  speed: number = 1.0,
): Promise<{ buffer: Buffer; durationSec: number }> {
  const zai = await getZAI();

  // Parse speaker-labeled lines and strip labels. Alternate voices for the two
  // hosts so it sounds like a real conversation. The user's selected voice is
  // used for Sam (expert); a complementary voice is used for Alex (learner).
  // Map: if user picked jam → Alex gets kazi; if kazi → Alex gets jam; etc.
  const ALEX_VOICE_MAP: Record<string, string> = {
    jam: 'kazi',
    kazi: 'jam',
    douji: 'kazi',
    xiaochen: 'jam',
    luodo: 'kazi',
    tongtong: 'jam',
    chuichui: 'jam',
  };
  const samVoice = voice;
  const alexVoice = ALEX_VOICE_MAP[voice] || 'kazi';

  const segments = parsePodcastScript(text);
  const buffers: Buffer[] = [];
  let totalChunks = 0;
  let successChunks = 0;

  // TTS with retry + delay to handle rate limits
  async function ttsWithRetry(input: string, v: string, retries = 2): Promise<Buffer | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Small delay between calls to avoid rate limiting
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
        else await new Promise(r => setTimeout(r, 300));

        const response = await zai.audio.tts.create({
          input,
          voice: v,
          speed,
          response_format: 'wav',
          stream: false,
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(new Uint8Array(arrayBuffer));
      } catch (err) {
        console.error(`TTS failed (voice=${v}, attempt ${attempt + 1}/${retries + 1}):`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
    return null;
  }

  if (segments.length > 0 && segments.some(s => s.speaker)) {
    // Two-voice mode: user's voice for Sam, complementary for Alex
    for (const seg of segments) {
      if (!seg.text.trim()) continue;
      const segVoice = seg.speaker === 'Alex' ? alexVoice : samVoice;
      const subChunks = splitTextIntoChunks(seg.text, 950);
      for (const chunk of subChunks) {
        totalChunks++;
        const buf = await ttsWithRetry(chunk, segVoice);
        if (buf && buf.length > 0) {
          buffers.push(buf);
          successChunks++;
        }
      }
    }
  } else {
    // Single-voice fallback (no speaker labels found)
    const chunks = splitTextIntoChunks(text, 950);
    for (const chunk of chunks) {
      totalChunks++;
      const buf = await ttsWithRetry(chunk, voice);
      if (buf && buf.length > 0) {
        buffers.push(buf);
        successChunks++;
      }
    }
  }

  console.log(`[TTS] ${successChunks}/${totalChunks} chunks succeeded`);

  // If most chunks failed, return an error indicator
  if (successChunks === 0) {
    return { buffer: Buffer.alloc(0), durationSec: 0 };
  }

  const merged = mergeWavBuffers(buffers);
  return { buffer: merged.buffer, durationSec: merged.durationSec };
}

/** Parse a podcast script into speaker-tagged segments. Strips "Name:" prefixes. */
function parsePodcastScript(script: string): { speaker: string; text: string }[] {
  const lines = script.split('\n');
  const segments: { speaker: string; text: string }[] = [];
  let currentSpeaker = '';
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentText) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
        currentText = '';
      }
      continue;
    }

    // Check if line starts with "Name:" or "Name :"
    const match = trimmed.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
    if (match) {
      // Save previous segment
      if (currentText) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = match[1];
      currentText = match[2];
    } else {
      // Continuation of current speaker's line
      currentText += ' ' + trimmed;
    }
  }
  // Don't forget the last segment
  if (currentText) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return segments;
}

/**
 * Merge multiple WAV file buffers into one valid WAV. Scans for the "data"
 * chunk marker (instead of assuming offset 44) because the TTS API inserts
 * an "AIGC" metadata chunk before the data. Returns a buffer + computed duration.
 */
function mergeWavBuffers(buffers: Buffer[]): { buffer: Buffer; durationSec: number } {
  if (buffers.length === 0) return { buffer: Buffer.alloc(0), durationSec: 0 };
  if (buffers.length === 1) {
    return { buffer: buffers[0], durationSec: wavDurationSec(buffers[0]) };
  }

  // Read format from the first buffer's "fmt " chunk
  const first = buffers[0];
  const fmtInfo = readFmtChunk(first);
  if (!fmtInfo) {
    // Fallback: just concatenate raw buffers
    return { buffer: Buffer.concat(buffers), durationSec: 0 };
  }
  const { sampleRate, channels, bitsPerSample } = fmtInfo;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;

  // Extract PCM data from each buffer by finding the "data" chunk
  let totalData = 0;
  const pcmChunks: Buffer[] = [];
  for (const buf of buffers) {
    const pcm = extractPcmData(buf);
    if (pcm && pcm.length > 0) {
      pcmChunks.push(pcm);
      totalData += pcm.length;
    }
  }

  if (totalData === 0) return { buffer: Buffer.alloc(0), durationSec: 0 };

  // Build a clean standard 44-byte WAV header
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalData, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(totalData, 40);

  const combined = Buffer.concat([header, ...pcmChunks]);
  const durationSec = byteRate > 0 ? Math.round(totalData / byteRate) : 0;
  return { buffer: combined, durationSec };
}

/** Find the "fmt " chunk and read sample rate, channels, bits per sample. */
function readFmtChunk(buf: Buffer): { sampleRate: number; channels: number; bitsPerSample: number } | null {
  // Scan for "fmt " marker
  const fmtIdx = buf.indexOf(Buffer.from('fmt '));
  if (fmtIdx < 0 || fmtIdx + 20 > buf.length) return null;
  return {
    channels: buf.readUInt16LE(fmtIdx + 8),
    sampleRate: buf.readUInt32LE(fmtIdx + 12),
    bitsPerSample: buf.readUInt16LE(fmtIdx + 22),
  };
}

/** Find the "data" chunk in a WAV buffer and return the raw PCM data. */
function extractPcmData(buf: Buffer): Buffer | null {
  const dataMarker = Buffer.from('data');
  const dataIdx = buf.indexOf(dataMarker);
  if (dataIdx < 0 || dataIdx + 8 > buf.length) return null;
  const dataLen = buf.readUInt32LE(dataIdx + 4);
  const pcmStart = dataIdx + 8;
  const pcmEnd = Math.min(buf.length, pcmStart + dataLen);
  if (pcmEnd <= pcmStart) return null;
  return buf.subarray(pcmStart, pcmEnd);
}

/** Compute duration of a single WAV buffer by finding the "data" chunk. */
function wavDurationSec(buf: Buffer): number {
  const pcm = extractPcmData(buf);
  if (!pcm) return 0;
  const fmt = readFmtChunk(buf);
  if (!fmt) return 0;
  const byteRate = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
  return byteRate > 0 ? Math.round(pcm.length / byteRate) : 0;
}

// ---------- helpers ----------

/** TTS chunk splitter respecting sentence boundaries. */
export function splitTextIntoChunks(text: string, maxLength = 950): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) || [text];
  let current = '';
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((current + ' ' + piece).length <= maxLength) {
      current = current ? current + ' ' + piece : piece;
    } else {
      if (current) chunks.push(current);
      if (piece.length > maxLength) {
        // hard split very long sentence
        for (let i = 0; i < piece.length; i += maxLength) {
          chunks.push(piece.slice(i, i + maxLength));
        }
        current = '';
      } else {
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Robust JSON parsing: strips code fences and finds the first JSON array/object. */
export function parseJsonLoose<T>(raw: string, arrayKey?: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  // strip code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // try direct parse
  try {
    const parsed = JSON.parse(text);
    if (arrayKey && parsed && typeof parsed === 'object' && arrayKey in parsed) {
      return parsed[arrayKey] as T;
    }
    return parsed as T;
  } catch {
    // fall through
  }
  // try to extract a {...} or [...] block
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (arrayKey && parsed && typeof parsed === 'object' && arrayKey in parsed) {
        return parsed[arrayKey] as T;
      }
      return parsed as T;
    } catch {
      // ignore
    }
  }
  return null;
}

/** SM-2 spaced-repetition update. quality: 0-5. */
export function sm2Update(opts: {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  quality: number; // 0=again ... 5=perfect
}) {
  let { repetitions, intervalDays, easeFactor, quality } = opts;
  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = repetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  const now = new Date();
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { repetitions, intervalDays, easeFactor, dueAt };
}

export interface StudyPlanTask {
  day: number;
  title: string;
  duration: string;
  focus: string;
  type: 'review' | 'learn' | 'quiz' | 'rest';
}

export interface StudyPlan {
  goal: string;
  totalDays: number;
  dailyMinutes: number;
  tasks: StudyPlanTask[];
  tips: string[];
}

/** Generate a personalized study plan from the user's study sets + a goal. */
export async function generateStudyPlan(opts: {
  goal: string;
  availableSets: { title: string; cardsDue: number; lastScore: number | null }[];
  dailyMinutes: number;
  daysAhead: number;
}): Promise<StudyPlan> {
  const system =
    'You are LearnX AI, an expert study planner. You output STRICT JSON only — no prose, no markdown fences. Shape: {"goal":"...","totalDays":N,"dailyMinutes":N,"tasks":[{"day":1,"title":"...","duration":"20 min","focus":"...","type":"review"}],"tips":["..."]}. Each task should be a concrete study action mapped to a specific day (1..totalDays). Vary types: review (flashcards), learn (read notes), quiz (take a quiz), rest (light day). Keep titles short. Tips are 3-5 short productivity tips.';
  const user = `Create a ${opts.daysAhead}-day study plan.

Goal: ${opts.goal}
Daily time available: ${opts.dailyMinutes} minutes

Available study sets:
${opts.availableSets.map((s, i) => `${i + 1}. ${s.title} — ${s.cardsDue} cards due, last quiz score: ${s.lastScore !== null ? s.lastScore + '%' : 'n/a'}`).join('\n') || '(no study sets yet — plan general study sessions)'}

Return JSON with ${opts.daysAhead} tasks (one per day), realistic durations that fit within ${opts.dailyMinutes} min/day, and 3-5 tips.`;
  const raw = await chatComplete(system, user);
  const parsed = parseJsonLoose<StudyPlan>(raw);
  if (!parsed) {
    return {
      goal: opts.goal,
      totalDays: opts.daysAhead,
      dailyMinutes: opts.dailyMinutes,
      tasks: [],
      tips: ['Start by reviewing your most overdue flashcards daily.'],
    };
  }
  return parsed;
}

export interface DailyLearningPath {
  greeting: string;
  summary: string;
  tasks: { title: string; reason: string; type: 'review' | 'quiz' | 'learn' | 'rest'; estimatedMinutes: number }[];
  tip: string;
}

/** Generate a personalized "Daily Learning Path" — a short prioritized to-do list. */
export async function generateDailyLearningPath(opts: {
  dueCards: number;
  totalStudySets: number;
  studySets: { title: string; cardsDue: number; lastScore: number | null; progress: number }[];
  streakDays: number;
  avgScore: number;
  recentActivity: string[];
}): Promise<DailyLearningPath> {
  const system =
    'You are LearnX AI, a motivational study coach. You output STRICT JSON only — no prose, no markdown fences. Shape: {"greeting":"short friendly greeting (1 sentence, can include the user\'s streak)","summary":"1-2 sentence overview of today\'s priorities","tasks":[{"title":"short action (e.g. \'Review 7 due flashcards — The Cell\')","reason":"why this matters now","type":"review|quiz|learn|rest","estimatedMinutes":N}],"tip":"one short productivity tip"}. Provide 2-4 tasks ordered by priority. Be specific and reference the user\'s actual study sets when relevant.';
  const user = `Create a daily learning path for the user.

Current state:
- ${opts.dueCards} flashcards due for review
- ${opts.totalStudySets} study set(s) total
- ${opts.streakDays}-day study streak
- Average quiz score: ${opts.avgScore}%

Study sets:
${opts.studySets.map((s) => `- ${s.title}: ${s.cardsDue} cards due, last quiz ${s.lastScore !== null ? s.lastScore + '%' : 'n/a'}, progress ${s.progress}%`).join('\n') || '(no study sets yet)'}

Recent activity:
${opts.recentActivity.length ? opts.recentActivity.slice(0, 5).join('\n') : '(no recent activity)'}

Return JSON with 2-4 prioritized tasks for today.`;
  const raw = await chatComplete(system, user);
  const parsed = parseJsonLoose<DailyLearningPath>(raw);
  if (!parsed) {
    return {
      greeting: opts.streakDays > 0 ? `Great ${opts.streakDays}-day streak! Keep it going.` : 'Ready to learn?',
      summary: opts.dueCards > 0 ? `You have ${opts.dueCards} flashcards due for review.` : 'No urgent reviews — a good time to learn something new.',
      tasks: opts.dueCards > 0
        ? [{ title: `Review ${opts.dueCards} due flashcards`, reason: 'Spaced repetition keeps your memory sharp', type: 'review', estimatedMinutes: 10 }]
        : [],
      tip: 'Consistency beats intensity. A few minutes daily works better than long cramming sessions.',
    };
  }
  return parsed;
}
