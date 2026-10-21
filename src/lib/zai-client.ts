// Thin HTTP client for the Z.AI internal API.
//
// This is a drop-in replacement for `z-ai-web-dev-sdk` that does NOT read
// any `.z-ai-config` file from disk (which fails on Vercel serverless
// functions because `process.cwd()` resolves to `/var/task/` and the file
// is not traced into the lambda bundle). Instead, we embed the same config
// values as constants here (they're already public — committed to the repo
// in `.z-ai-config`), with optional per-field env-var overrides so we can
// rotate keys without code changes if ever needed.
//
// All functions are server-side only.

export interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
}

// Default values are read from the committed `.z-ai-config` file (public).
// Override any field with `ZAI_BASE_URL`, `ZAI_API_KEY`, `ZAI_CHAT_ID`,
// `ZAI_USER_ID`, or `ZAI_TOKEN` env vars if needed.
const DEFAULT_CONFIG: ZaiConfig = {
  baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
  apiKey: process.env.ZAI_API_KEY || 'Z.ai',
  chatId: process.env.ZAI_CHAT_ID || 'chat-3c46b3be-dcbd-49a8-8352-bf50b1e72094',
  userId: process.env.ZAI_USER_ID || 'a1457489-0cf3-4dfa-a0e6-89948460525d',
  token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTE0NTc0ODktMGNmMy00ZGZhLWEwZTYtODk5NDg0NjA1MjVkIiwiY2hhdF9pZCI6ImNoYXQtM2M0NmIzYmUtZGNiZC00OWE4LTgzNTItYmY1MGIxZTcyMDk0IiwicGxhdGZvcm0iOiJ6YWkifQ.mSxyxLQp0M3niFs0WBm0v5Lrr3gvARkb8W_EhM9_XjM',
};

function buildHeaders(cfg: ZaiConfig): Record<string, string> {
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

/**
 * Create a chat completion (non-streaming). Returns the parsed JSON response.
 * `thinking` defaults to `disabled` to match the SDK's behavior.
 */
export async function chatCompletions(
  messages: ChatMessage[],
  opts: { stream?: boolean; thinking?: { type: 'enabled' | 'disabled' }; model?: string } = {},
): Promise<ChatCompletionResponse> {
  const cfg = DEFAULT_CONFIG;
  const url = `${cfg.baseUrl}/chat/completions`;
  const body = {
    messages,
    thinking: opts.thinking || { type: 'disabled' },
    ...(opts.model ? { model: opts.model } : {}),
    stream: false,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI chat completions failed (${response.status}): ${errorBody.slice(0, 500)}`);
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
  const cfg = DEFAULT_CONFIG;
  const url = `${cfg.baseUrl}/chat/completions`;
  const body = {
    messages,
    thinking: opts.thinking || { type: 'disabled' },
    ...(opts.model ? { model: opts.model } : {}),
    stream: true,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI chat stream failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }
  if (!response.body) {
    throw new Error('Z.AI chat stream returned no body');
  }
  // Return the raw SSE byte stream so callers can parse `data: {...}` lines
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
 */
export async function tts(body: {
  input: string;
  voice?: string;
  speed?: number;
  response_format?: string;
  stream?: boolean;
  model?: string;
}): Promise<Response> {
  const cfg = DEFAULT_CONFIG;
  const url = `${cfg.baseUrl}/audio/tts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI TTS failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }
  return response;
}

/**
 * Transcribe audio via ASR. Pass `file_base64` (base64-encoded audio bytes,
 * no data-URL prefix). Returns the parsed JSON `{ text: string }`.
 */
export async function asr(body: {
  file_base64?: string;
  file?: string;
  model?: string;
  stream?: boolean;
}): Promise<{ text?: string; [key: string]: unknown }> {
  const cfg = DEFAULT_CONFIG;
  const url = `${cfg.baseUrl}/audio/asr`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI ASR failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }
  return (await response.json()) as { text?: string };
}

/**
 * Invoke a remote function (web_search, page_reader, etc.). Returns the
 * `result` field of the JSON response, matching the SDK behavior.
 */
export async function invokeFunction<T = unknown>(
  function_name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const cfg = DEFAULT_CONFIG;
  const url = `${cfg.baseUrl}/functions/invoke`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify({ function_name, arguments: args }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Z.AI function invoke failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }
  const json = (await response.json()) as { result?: T };
  return json.result as T;
}
