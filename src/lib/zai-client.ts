// Thin HTTP client for chat / audio / vision AI.
//
// Why this exists:
//   The `z-ai-web-dev-sdk` reads `.z-ai-config` from `process.cwd()`, which
//   on Vercel serverless functions resolves to `/var/task/` where the file
//   is NOT traced into the lambda bundle. That throws "Configuration file
//   not found or invalid" for every AI call on Vercel.
//
//   Worse, even after bypassing the file lookup, `internal-api.z.ai` only
//   resolves to RFC-1918 private IPs (172.25.x.x) — meaning Vercel's
//   serverless functions physically cannot route to the Z.AI API. The
//   hostname is only reachable from inside Z.ai's private network (e.g.
//   the dev sandbox).
//
//   So this client supports TWO providers:
//   1. Z.AI internal API (default — works in the sandbox).
//   2. Groq's OpenAI-compatible API (set `GROQ_API_KEY` to enable — works
//      from anywhere including Vercel). Free tier: https://console.groq.com.
//
//   When on Vercel, set the env var `GROQ_API_KEY` to a free Groq key and
//   AI features will work. Without it, AI calls fail gracefully (each route
//   has a fallback) and the rest of the app keeps working.
//
// All functions are server-side only.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message?: { role: string; content: string };
    finish_reason?: string;
    index?: number;
  }>;
  id?: string;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
}

// Default Z.AI config values are read from the committed `.z-ai-config` file
// (public). Override any field with `ZAI_BASE_URL`, `ZAI_API_KEY`, etc.
const ZAI_CONFIG: ZaiConfig = {
  baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
  apiKey: process.env.ZAI_API_KEY || 'Z.ai',
  chatId: process.env.ZAI_CHAT_ID || 'chat-3c46b3be-dcbd-49a8-8352-bf50b1e72094',
  userId: process.env.ZAI_USER_ID || 'a1457489-0cf3-4dfa-a0e6-89948460525d',
  token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTE0NTc0ODktMGNmMy00ZGZhLWEwZTYtODk5NDg0NjA1MjVkIiwiY2hhdF9pZCI6ImNoYXQtM2M0NmIzYmUtZGNiZC00OWE4LTgzNTItYmY1MGIxZTcyMDk0IiwicGxhdGZvcm0iOiJ6YWkifQ.mSxyxLQp0M3niFs0WBm0v5Lrr3gvARkb8W_EhM9_XjM',
};

// Groq provider config (OpenAI-compatible). Get a free key at
// https://console.groq.com — set as `GROQ_API_KEY` env var on Vercel.
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function buildZaiHeaders(cfg: ZaiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`,
    'X-Z-AI-From': 'Z',
  };
  if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
  if (cfg.userId) headers['X-User-Id'] = cfg.userId;
  if (cfg.token) headers['X-Token'] = cfg.token;
  return headers;
}

function buildGroqHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROQ_API_KEY}`,
  };
}

/**
 * Returns true if we're likely running on Vercel (where Z.AI internal API
 * is unreachable). Vercel always sets `VERCEL=1` automatically.
 */
function isVercel(): boolean {
  return process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
}

/**
 * Create a chat completion (non-streaming) using the best available provider.
 * Tries Z.AI first (in sandbox); on Vercel skips Z.AI and uses Groq if
 * `GROQ_API_KEY` is set. Throws if all providers fail.
 */
export async function chatCompletions(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string } = {},
): Promise<ChatCompletionResponse> {
  let lastError: Error | null = null;

  if (!isVercel()) {
    try {
      return await zaiChat(messages, opts);
    } catch (e) {
      console.error('[zai-client] Z.AI chat failed:', (e as Error).message);
      lastError = e as Error;
    }
  } else {
    lastError = new Error('Z.AI skipped (running on Vercel — internal API unreachable)');
  }

  // Fall back to Groq if configured
  if (GROQ_API_KEY) {
    try {
      return await groqChat(messages, opts);
    } catch (e) {
      console.error('[zai-client] Groq chat failed:', (e as Error).message);
      lastError = e as Error;
    }
  }

  throw lastError || new Error('No AI provider available (set GROQ_API_KEY on Vercel)');
}

/** Direct Z.AI chat completions call. */
async function zaiChat(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string },
): Promise<ChatCompletionResponse> {
  const url = `${ZAI_CONFIG.baseUrl}/chat/completions`;
  const body = {
    messages,
    thinking: opts.thinking || { type: 'disabled' },
    ...(opts.model ? { model: opts.model } : {}),
    stream: false,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildZaiHeaders(ZAI_CONFIG),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI chat (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return (await response.json()) as ChatCompletionResponse;
}

/** Groq (OpenAI-compatible) chat completions call. */
async function groqChat(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string },
): Promise<ChatCompletionResponse> {
  const url = `${GROQ_BASE_URL}/chat/completions`;
  const body = {
    model: opts.model || GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: false,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildGroqHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq chat (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return (await response.json()) as ChatCompletionResponse;
}

/**
 * Create a streaming chat completion. Returns a ReadableStream<Uint8Array>
 * of raw SSE bytes (matching the SDK's return type when `stream: true`).
 */
export async function chatCompletionsStream(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string } = {},
): Promise<ReadableStream<Uint8Array>> {
  let lastError: Error | null = null;

  if (!isVercel()) {
    try {
      return await zaiChatStream(messages, opts);
    } catch (e) {
      console.error('[zai-client] Z.AI stream failed:', (e as Error).message);
      lastError = e as Error;
    }
  } else {
    lastError = new Error('Z.AI skipped (Vercel)');
  }

  if (GROQ_API_KEY) {
    try {
      return await groqChatStream(messages, opts);
    } catch (e) {
      console.error('[zai-client] Groq stream failed:', (e as Error).message);
      lastError = e as Error;
    }
  }

  throw lastError || new Error('No AI provider available for streaming');
}

async function zaiChatStream(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string },
): Promise<ReadableStream<Uint8Array>> {
  const url = `${ZAI_CONFIG.baseUrl}/chat/completions`;
  const body = {
    messages,
    thinking: opts.thinking || { type: 'disabled' },
    ...(opts.model ? { model: opts.model } : {}),
    stream: true,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildZaiHeaders(ZAI_CONFIG),
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    throw new Error(`Z.AI stream (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return response.body as ReadableStream<Uint8Array>;
}

async function groqChatStream(
  messages: ChatMessage[],
  opts: { thinking?: { type: 'enabled' | 'disabled' }; model?: string },
): Promise<ReadableStream<Uint8Array>> {
  const url = `${GROQ_BASE_URL}/chat/completions`;
  const body = {
    model: opts.model || GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildGroqHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    throw new Error(`Groq stream (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return response.body as ReadableStream<Uint8Array>;
}

/** Convenience: call the LLM with a system + user message and return text. */
export async function chatComplete(system: string, user: string): Promise<string> {
  const completion = await chatCompletions([
    { role: 'assistant', content: system },
    { role: 'user', content: user },
  ]);
  const content = completion.choices[0]?.message?.content ?? '';
  return content.trim();
}

/** Convenience: multi-turn chat given prior messages + a system prompt. */
export async function chatMultiTurn(
  messages: { role: 'user' | 'assistant'; content: string }[],
  system: string,
): Promise<string> {
  const fullMessages: ChatMessage[] = [
    { role: 'assistant', content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const completion = await chatCompletions(fullMessages);
  return (completion.choices[0]?.message?.content ?? '').trim();
}

/**
 * Synthesize speech via TTS. Returns the Response object so the caller can
 * decide how to consume it (arrayBuffer, blob, etc.) — matches SDK behavior.
 *
 * Only Z.AI is supported for TTS (Groq doesn't offer TTS). On Vercel, this
 * will fail — the podcast feature requires the sandbox environment.
 */
export async function tts(body: {
  input: string;
  voice?: string;
  speed?: number;
  response_format?: string;
  stream?: boolean;
  model?: string;
}): Promise<Response> {
  if (isVercel()) {
    throw new Error('TTS only available in the dev sandbox (Z.AI internal API required)');
  }
  const url = `${ZAI_CONFIG.baseUrl}/audio/tts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildZaiHeaders(ZAI_CONFIG),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI TTS failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return response;
}

/**
 * Transcribe audio via ASR. Pass `file_base64` (base64-encoded audio bytes,
 * no data-URL prefix). Only Z.AI is supported for ASR (Groq offers Whisper
 * but uses a different API; we'd need to add Groq ASR separately).
 */
export async function asr(body: {
  file_base64?: string;
  file?: string;
  model?: string;
  stream?: boolean;
}): Promise<{ text?: string; [key: string]: unknown }> {
  if (isVercel()) {
    // Use Groq's Whisper API on Vercel if a key is configured
    if (GROQ_API_KEY && body.file_base64) {
      return groqAsr(body.file_base64);
    }
    throw new Error('ASR requires GROQ_API_KEY on Vercel or Z.AI sandbox');
  }
  const url = `${ZAI_CONFIG.baseUrl}/audio/asr`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildZaiHeaders(ZAI_CONFIG),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI ASR failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return (await response.json()) as { text?: string };
}

async function groqAsr(fileBase64: string): Promise<{ text?: string }> {
  const url = `${GROQ_BASE_URL}/audio/transcriptions`;
  // Groq's transcription endpoint expects multipart/form-data
  const audioBuffer = Buffer.from(fileBase64, 'base64');
  const blob = new Blob([audioBuffer], { type: 'audio/wav' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.wav');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq ASR (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  return (await response.json()) as { text?: string };
}

/**
 * Invoke a remote function (web_search, page_reader, etc.).
 * Only Z.AI is supported (Groq doesn't have these built-in functions).
 */
export async function invokeFunction<T = unknown>(
  function_name: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (isVercel()) {
    throw new Error(`Function '${function_name}' only available in dev sandbox (Z.AI internal API)`);
  }
  const url = `${ZAI_CONFIG.baseUrl}/functions/invoke`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildZaiHeaders(ZAI_CONFIG),
    body: JSON.stringify({ function_name, arguments: args }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI function invoke failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }
  const json = (await response.json()) as { result?: T };
  return json.result as T;
}
