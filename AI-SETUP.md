# LearnX AI — AI Provider Setup

LearnX AI can use two AI providers, automatically picked based on the runtime environment.

## 1. Z.AI (default, sandbox-only)

The `z-ai-web-dev-sdk` is designed to work from inside Z.ai's private network.
The internal API endpoint (`internal-api.z.ai`) only resolves to RFC-1918
private IPs (172.25.x.x), so it works in the dev sandbox but is **unreachable
from public clouds** like Vercel.

If you're running locally in the Z.ai sandbox, AI works out of the box — no
setup needed.

## 2. Groq (recommended for Vercel)

Groq is a fast, free, OpenAI-compatible LLM provider that works from any
public cloud. Get a free API key:

1. Visit https://console.groq.com/keys
2. Sign in / create a free account
3. Create an API key (default keys work — the free tier is generous)
4. Copy the key (starts with `gsk_...`)

Add it to your Vercel project:

1. Open your Vercel project → Settings → Environment Variables
2. Add a new variable:
   - **Key**: `GROQ_API_KEY`
   - **Value**: `gsk_your_key_here`
   - **Environments**: Production, Preview, Development (all three)
3. Save → Vercel will automatically redeploy

That's it — every AI feature (notes, flashcards, quizzes, summaries, study
plans, daily learning path, AI tutor chat) will now work on Vercel.

## Diagnosing AI issues

Visit `/settings` and look at the "AI Engine Status" card. It tells you:

- Which provider is active (Z.AI, Groq, or none)
- Whether AI calls are actually working
- The last error message if not working
- Step-by-step fix instructions if not configured

You can also hit the API endpoint directly: `GET /api/ai-status` returns
JSON with the same info — useful for debugging from the terminal.

## Default model

Groq defaults to `llama-3.3-70b-versatile` (free, fast, smart). Override
with the `GROQ_MODEL` env var if you want a different one (e.g.
`llama-3.1-8b-instant` for faster responses, or
`deepseek-r1-distill-llama-70b` for reasoning tasks).

## TTS / podcasts / web reader

Some Z.AI-specific features (text-to-speech for podcasts, the `page_reader`
function for URL ingestion) only work in the sandbox — there's no
publicly-reachable equivalent. These features will return a clear error
message when used on Vercel. The podcast script generation (text) still
works via Groq; only the audio synthesis is sandbox-only.

## Switching providers manually

If you want to force a specific provider regardless of environment, set:

- `ZAI_BASE_URL` — override the Z.AI endpoint
- `GROQ_API_KEY` — enable Groq fallback (or primary on Vercel)
- `GROQ_BASE_URL` — override the Groq endpoint
- `GROQ_MODEL` — override the Groq model
