'use client';

import * as React from 'react';
import { Send, Sparkles, Loader2, Plus, MessageSquare, Trash2, Bot, User, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Markdown } from '@/components/markdown';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/stores/app-store';
import { useVoiceInput } from '@/lib/stores/use-voice-input';
import { toast } from 'sonner';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/time';

const SAMPLE_PROMPTS = [
  'Explain photosynthesis like I\'m 12',
  'Quiz me on the causes of World War I',
  'What\'s the difference between mitosis and meiosis?',
  'Help me memorize the first 10 elements of the periodic table',
  'Summarize the key ideas of supply and demand',
];

export function TutorView() {
  const sessionId = useAppStore((s) => s.sessionId);
  const setSessionId = useAppStore((s) => s.setSessionId);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loadingSession, setLoadingSession] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // prevents loadMessages from wiping optimistic messages when a session
  // was just created in handleSend (no-session flow).
  const justCreatedRef = React.useRef<string | null>(null);

  const voice = useVoiceInput({
    onTranscript: (text) => {
      setInput((prev) => (prev ? prev + ' ' + text : text));
      toast.success('Voice transcribed');
    },
    onError: (msg) => toast.error('Voice input failed', { description: msg }),
  });

  const loadSessions = React.useCallback(async () => {
    try {
      const res = await api.get<{ sessions: ChatSession[] }>('/api/chat/sessions');
      setSessions(res.sessions);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadMessages = React.useCallback(async (id: string) => {
    setLoadingSession(true);
    try {
      const res = await api.get<{ session: ChatSession }>(`/api/chat/sessions/${id}`);
      setMessages(res.session.messages);
    } catch (e) {
      toast.error('Failed to load chat', { description: (e as Error).message });
    } finally {
      setLoadingSession(false);
    }
  }, []);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  React.useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    if (justCreatedRef.current === sessionId) {
      // session was just created in handleSend; optimistic messages already set
      justCreatedRef.current = null;
      return;
    }
    loadMessages(sessionId);
  }, [sessionId, loadMessages]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function handleNewChat() {
    try {
      const res = await api.post<{ session: ChatSession }>('/api/chat/sessions', {
        title: 'New chat',
      });
      setSessionId(res.session.id);
      setMessages([]);
      loadSessions();
    } catch (e) {
      toast.error('Failed to start chat', { description: (e as Error).message });
    }
  }

  async function handleSend(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || sending) return;
    if (!sessionId) {
      // create session on the fly
      try {
        const res = await api.post<{ session: ChatSession }>('/api/chat/sessions', {
          title: text.slice(0, 50),
        });
        justCreatedRef.current = res.session.id;
        setSessionId(res.session.id);
        loadSessions();
        await sendToSession(res.session.id, text);
      } catch (e) {
        toast.error('Failed to start chat', { description: (e as Error).message });
      }
      return;
    }
    await sendToSession(sessionId, text);
  }

  async function sendToSession(id: string, text: string) {
    setInput('');
    setSending(true);
    const tempUser: ChatMessage = {
      id: 'temp-' + Date.now(),
      sessionId: id,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);
    // optimistic assistant placeholder
    const placeholderId = 'temp-a-' + Date.now();
    setMessages((m) => [
      ...m,
      {
        id: placeholderId,
        sessionId: id,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      // Streaming SSE request
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, message: text }),
      });
      if (!res.ok || !res.body) throw new Error('Stream request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.delta) {
              accumulated += parsed.delta;
              setMessages((m) =>
                m.map((msg) => (msg.id === placeholderId ? { ...msg, content: accumulated } : msg)),
              );
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseErr) {
            // ignore partial lines
          }
        }
      }
      loadSessions();
    } catch (e) {
      setMessages((m) => m.filter((msg) => msg.id !== placeholderId));
      toast.error('AI reply failed', { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteSession(id: string) {
    try {
      await api.del(`/api/chat/sessions/${id}`);
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
      loadSessions();
      toast.success('Chat deleted');
    } catch (e) {
      toast.error('Delete failed', { description: (e as Error).message });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sessions sidebar */}
        <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
          <Button onClick={handleNewChat} className="w-full gap-2">
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto scrollbar-thin pr-1">
            {sessions.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No chats yet. Start one!
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm transition-colors hover:bg-muted',
                  sessionId === s.id && 'border-border bg-muted',
                )}
              >
                <button
                  onClick={() => setSessionId(s.id)}
                  className="flex flex-1 items-center gap-2 min-w-0 text-left"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex flex-1 min-w-0 flex-col">
                    <span className="truncate leading-tight">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(s.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteSession(s.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <Card className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col overflow-hidden">
          {!sessionId && messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-white shadow-xl shadow-primary/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold">Your AI Tutor</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Ask anything — get a clear, patient explanation.
                </p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    disabled={sending}
                    className={cn(
                      'group rounded-xl border bg-background p-3 text-left text-sm transition-all hover:shadow-md disabled:opacity-50',
                      i === 0
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                        : 'border-border hover:border-primary/40 hover:bg-muted',
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <Sparkles className={cn('mt-0.5 h-4 w-4 shrink-0', i === 0 ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                      <span>{p}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((m, i) => (
                    <ChatBubble
                      key={m.id}
                      message={m}
                      isLast={i === messages.length - 1}
                    />
                  ))}
                </div>
              </div>
              <div className="border-t border-border bg-background/80 p-3 backdrop-blur md:p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={voice.recording ? 'Listening… speak now' : 'Ask your tutor anything...'}
                    className={cn(
                      'min-h-[44px] max-h-32 resize-none',
                      voice.recording && 'border-rose-400/60 ring-2 ring-rose-400/20',
                    )}
                    rows={1}
                  />
                  {voice.supported && (
                    <Button
                      onClick={voice.recording ? voice.stop : voice.start}
                      variant={voice.recording ? 'destructive' : 'outline'}
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      title={voice.recording ? 'Stop recording' : 'Voice input'}
                      disabled={voice.transcribing}
                    >
                      {voice.transcribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : voice.recording ? (
                        <Square className="h-4 w-4 fill-current" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSend()}
                    disabled={sending || !input.trim()}
                    size="icon"
                    className="h-11 w-11 shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-muted-foreground">
                  {voice.recording
                    ? 'Recording… click the stop button when done'
                    : 'Press Enter to send · Shift+Enter for a new line' + (voice.supported ? ' · Mic for voice' : '')}
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function ChatBubble({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isUser = message.role === 'user';
  const isThinking = !message.content && message.role === 'assistant';
  const isStreaming = !isUser && isLast && message.content.length > 0;
  return (
    <div className={cn('flex gap-3 animate-float-up', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'brand-gradient text-white',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {isThinking ? (
          <div className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-current animate-pulse-soft" />
              <span className="h-2 w-2 rounded-full bg-current animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
              <span className="h-2 w-2 rounded-full bg-current animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
            </span>
            Thinking...
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="relative">
            <Markdown content={message.content} className="text-sm" />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
