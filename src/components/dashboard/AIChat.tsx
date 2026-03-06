import { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, MessageSquare, Plus, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTIONS = [
  "Which small cap funds gave the highest returns last year?",
  "Compare large cap vs flexi cap funds for long term",
  "Best SIP strategy for a conservative investor",
  "Explain Sharpe Ratio and why it matters",
];

function AuctusIcon({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center", className)}>
      <Zap className="h-4 w-4 text-primary" />
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <AuctusIcon className="h-8 w-8 flex-shrink-0" />
      <div className="bg-secondary/60 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-xs text-muted-foreground ml-2">Auctus is thinking...</span>
      </div>
    </div>
  );
}

export function AIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = sessionStorage.getItem('cifraa_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }));
      }
    } catch {}
    return [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save sessions to sessionStorage
  useEffect(() => {
    if (sessions.length > 0) {
      sessionStorage.setItem('cifraa_chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Sync messages back to session
  useEffect(() => {
    if (activeSessionId && messages.length > 0 && !isLoading) {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, messages } : s
      ));
    }
  }, [messages, isLoading, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const createNewSession = () => {
    const id = crypto.randomUUID();
    setActiveSessionId(id);
    setMessages([]);
    setShowHistory(false);
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setActiveSessionId(sessionId);
      const newSession: ChatSession = {
        id: sessionId,
        title: text.trim().slice(0, 50),
        messages: [],
        createdAt: new Date(),
      };
      setSessions(prev => [newSession, ...prev]);
    }

    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    setIsStreaming(false);

    let assistantSoFar = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Please log in to use Auctus.');
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              if (!isStreaming) setIsStreaming(true);
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === 'assistant'
                    ? { ...m, content: assistantSoFar }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }

      setSessions(prev => prev.map(s =>
        s.id === sessionId && s.title === text.trim().slice(0, 50)
          ? { ...s, title: text.trim().slice(0, 50) }
          : s
      ));
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${e.message || 'Something went wrong. Please try again.'}` },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // History view
  if (showHistory) {
    return (
      <div className="animate-fade-in flex flex-col min-h-[60vh] px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">Previous Chats</h2>
          </div>
          <Button variant="outline" size="sm" onClick={createNewSession} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>
        {sessions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">No previous chats yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  s.id === activeSessionId
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 bg-card/50 hover:bg-primary/5 hover:border-primary/30"
                )}
              >
                <p className="font-medium text-sm text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.messages.length} messages • {s.createdAt.toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Initial empty state
  if (messages.length === 0 && !activeSessionId) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-2xl flex justify-end mb-4">
          {sessions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Previous Chats ({sessions.length})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <Zap className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-1">
          Auctus
        </h2>
        <p className="text-sm text-primary/70 font-medium mb-2">Your Financial Intelligence</p>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Ask anything about mutual funds — returns, comparisons, strategies, and more.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Auctus about mutual funds..."
              className="w-full h-14 pl-5 pr-14 rounded-2xl bg-secondary/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-left p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <AuctusIcon className="h-6 w-6" />
          <span className="text-sm font-semibold text-primary">Auctus</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground truncate max-w-[180px]">
            {sessions.find(s => s.id === activeSessionId)?.title || 'New Chat'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              History
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={createNewSession} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <AuctusIcon className="h-8 w-8 flex-shrink-0 mt-1" />
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-foreground'
              )}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && !isStreaming && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border/40 pt-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Auctus a follow-up..."
            disabled={isLoading}
            className="w-full h-12 pl-4 pr-14 rounded-xl bg-secondary/50 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
