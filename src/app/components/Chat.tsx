'use client'

import { useEffect, useRef, useState } from 'react'
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ToolCallBadge from './ToolCallBadge'
import SettingsPanel from './SettingsPanel'
import DataView, { extractTableData } from './DataView'
import { useFeatures } from '@/lib/features/client'
import type { Element } from 'hast'

interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: string
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  text?: string
  toolCalls?: ToolCall[]
}

type StreamEvent =
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string }

// Defined outside the component to avoid re-creation on every render
const markdownComponents: Components = {
  table({ node }) {
    if (!node) return null
    const { headers, rows } = extractTableData(node as Element)
    return <DataView headers={headers} rows={rows} />
  },
}

const markdownComponentsNoChart: Components = {}

const SUGGESTIONS = [
  { icon: '🗂️', label: 'What tables are in this database?' },
  { icon: '📊', label: 'Show me a summary of the data across key tables' },
  { icon: '📈', label: 'What trends can you find in the data?' },
  { icon: '🔍', label: 'Are there any anomalies or outliers?' },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { flags, setFlag } = useFeatures()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const updated: Message[] = [
      ...messages,
      { id: Date.now(), role: 'user', text: content },
    ]
    setMessages(updated)
    setInput('')
    setLoading(true)

    const assistantId = Date.now() + 1
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', toolCalls: [] }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, text: m.text ?? '' })),
          features: { mcpTools: flags.mcpTools, systemPrompt: flags.systemPrompt },
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as StreamEvent

          if (event.type === 'tool_call') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name, args: event.args }] }
                  : m
              )
            )
          } else if (event.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: m.toolCalls?.map((tc) =>
                        tc.name === event.name && tc.result === undefined
                          ? { ...tc, result: event.result }
                          : tc
                      ),
                    }
                  : m
              )
            )
          } else if (event.type === 'text') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: event.text } : m))
            )
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: `Error: ${event.message}` } : m
              )
            )
          }
        }
      }
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 shrink-0">
          <svg className="w-4 h-4 text-white dark:text-zinc-900" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="8" cy="4.5" rx="5.5" ry="2" />
            <path d="M2.5 4.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
            <path d="M2.5 7.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">pgchat</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">PostgreSQL data analyst</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setIsPanelOpen(true)}
            aria-label="Settings"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {isPanelOpen && (
        <SettingsPanel flags={flags} setFlag={setFlag} onClose={() => setIsPanelOpen(false)} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4">
                <svg className="w-7 h-7 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="12" cy="6" rx="8" ry="3" />
                  <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
                  <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Ask anything about your data</h2>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Gemini will explore your schema and run SQL to answer</p>
            </div>
            {flags.suggestions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.label)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="text-base shrink-0">{s.icon}</span>
                    <span className="leading-snug">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white dark:text-zinc-900" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <ellipse cx="8" cy="4.5" rx="5.5" ry="2" />
                      <path d="M2.5 4.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
                      <path d="M2.5 7.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
                    </svg>
                  </div>
                )}

                <div className={`max-w-[85%] ${msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col gap-2'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                  ) : (
                    <>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {msg.toolCalls.map((tc, i) => (
                            <ToolCallBadge key={i} name={tc.name} args={tc.args} result={tc.result} />
                          ))}
                        </div>
                      )}
                      {msg.text && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
                          {flags.markdownRendering
                            ? (
                              <Markdown
                                remarkPlugins={[remarkGfm]}
                                components={flags.chartView ? markdownComponents : markdownComponentsNoChart}
                              >
                                {msg.text}
                              </Markdown>
                            )
                            : <span className="whitespace-pre-wrap text-sm">{msg.text}</span>
                          }
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && !messages.at(-1)?.text && !(messages.at(-1)?.toolCalls?.length) && (
              <div className="flex gap-3 items-start">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 shrink-0">
                  <svg className="w-3.5 h-3.5 text-white dark:text-zinc-900" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <ellipse cx="8" cy="4.5" rx="5.5" ry="2" />
                    <path d="M2.5 4.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
                    <path d="M2.5 7.5v3c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-3" />
                  </svg>
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm px-4 py-4">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data…"
            className="flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 max-h-40 overflow-y-auto transition-shadow"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all disabled:opacity-25 hover:scale-105 active:scale-95"
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 3.105a.75.75 0 0 1 .815-.156l13.5 6a.75.75 0 0 1 0 1.4l-13.5 6a.75.75 0 0 1-1.03-.892L4.927 10 2.89 4.543a.75.75 0 0 1 .215-.438Z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
