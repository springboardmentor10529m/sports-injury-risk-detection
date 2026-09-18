import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const BACKEND_BASE = 'http://127.0.0.1:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'What does my risk score mean?',
  'How can I prevent knee injuries?',
  'What is the MediaPipe pose tracking?',
  'How is the risk score calculated?',
  'What should I do for a high risk result?',
]

async function sendChat(message: string, history: Message[]): Promise<string> {
  const res = await fetch(`${BACKEND_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
  if (!res.ok) throw new Error('Chat service unavailable')
  const data = (await res.json()) as { reply: string }
  return data.reply
}

function renderMessageContent(content: string) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1.5 text-xs">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim()
        if (!line) {
          return <div key={idx} className="h-1.5" />
        }

        const bulletMatch = line.match(/^([•\-*]|\d+\.)\s+(.*)$/)
        let prefix = ''
        let body = line

        if (bulletMatch) {
          prefix = bulletMatch[1]
          body = bulletMatch[2]
        }

        const parseFormattedText = (text: string) => {
          const parts = text.split(/(\*\*.*?\*\*)/g)
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldText = part.slice(2, -2).replace(/\*/g, '')
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {boldText}
                </strong>
              )
            }
            const clean = part.replace(/\*/g, '')
            return <span key={pIdx}>{clean}</span>
          })
        }

        if (bulletMatch) {
          const isNumbered = /^\d+\./.test(prefix)
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              {isNumbered ? (
                <span className="shrink-0 font-bold text-[#2563eb] text-[11px] min-w-[14px]">
                  {prefix}
                </span>
              ) : (
                <span className="shrink-0 text-[#2563eb] font-black text-sm leading-none mt-0.5">•</span>
              )}
              <div className="flex-1 leading-relaxed">
                {parseFormattedText(body)}
              </div>
            </div>
          )
        }

        const isHeader = line.endsWith(':') && line.length < 60
        return (
          <p
            key={idx}
            className={`leading-relaxed ${
              isHeader ? 'font-bold text-slate-900 mt-1 mb-0.5' : ''
            }`}
          >
            {parseFormattedText(line)}
          </p>
        )
      })}
    </div>
  )
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNewMsg, setHasNewMsg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setHasNewMsg(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setError(null)
    const newHistory: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newHistory)
    setLoading(true)
    try {
      const reply = await sendChat(msg, newHistory)
      setMessages([...newHistory, { role: 'assistant', content: reply }])
      if (!open) setHasNewMsg(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        id="chatbot-toggle"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none
          bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white
          hover:scale-110 active:scale-95
          ${open ? 'rotate-0 scale-95' : ''}`}
      >
        {open ? (
          <ChevronDown size={22} />
        ) : (
          <MessageCircle size={22} />
        )}
        {!open && hasNewMsg && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-bounce">
            !
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right
          ${open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}
        `}
        style={{
          width: 'min(400px, calc(100vw - 24px))',
          height: 'min(560px, calc(100vh - 120px))',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(30, 58, 95, 0.15)',
        }}
        aria-label="MotionGuard AI Assistant"
        role="dialog"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-sm font-black leading-tight tracking-wide">MotionGuard AI</p>
              <p className="text-[10px] text-blue-200">Sports Medicine Assistant</p>
            </div>
          </div>
          <button
            id="chatbot-close"
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 transition hover:bg-white/20"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin" id="chatbot-messages">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white shadow-lg">
                <Sparkles size={28} />
              </div>
              <div>
                <p className="font-black text-[#1e3a5f] text-sm">How can I help you today?</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">Ask me about injury risk scores, biomechanics, prevention tips, or how to use MotionGuard.</p>
              </div>
              <div className="flex flex-col gap-1.5 w-full mt-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => { void handleSend(q) }}
                    className="text-left rounded-xl border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#1e3a5f] transition hover:bg-[#2563eb]/15 hover:border-[#2563eb]/40"
                    id={`quick-q-${q.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white shadow">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white'
                    : 'rounded-tl-sm bg-white/95 text-[#1e3a5f] border border-slate-100 shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white shadow">
                <Bot size={14} />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white/90 border border-slate-100 px-4 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick questions (after messages) */}
        {messages.length > 0 && !loading && (
          <div className="shrink-0 border-t border-slate-100 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { void handleSend(q) }}
                className="shrink-0 rounded-full border border-[#2563eb]/25 bg-[#2563eb]/8 px-2.5 py-1 text-[10px] font-semibold text-[#1e3a5f] transition hover:bg-[#2563eb]/20 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="shrink-0 border-t border-slate-100 bg-white/70 px-3 py-2.5 flex items-end gap-2">
          <textarea
            ref={inputRef}
            id="chatbot-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your analysis, injury prevention…"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-[#1e3a5f] placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] disabled:opacity-50"
            style={{ maxHeight: '80px', minHeight: '36px' }}
          />
          <button
            id="chatbot-send"
            type="button"
            onClick={() => { void handleSend() }}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white shadow transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </>
  )
}
