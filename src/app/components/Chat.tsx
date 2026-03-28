'use client'

import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import ToolCallBadge from './ToolCallBadge'

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

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const updated: Message[] = [
      ...messages,
      { id: Date.now(), role: 'user', text },
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          pgchat
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <p className="text-center text-zinc-400 dark:text-zinc-600 text-sm mt-16 select-none">
            Send a message to start the conversation
          </p>
        ) : (
          <ul className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-sm whitespace-pre-wrap'
                      : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mb-2 flex flex-col gap-0.5">
                          {msg.toolCalls.map((tc, i) => (
                            <ToolCallBadge key={i} name={tc.name} args={tc.args} result={tc.result} />
                          ))}
                        </div>
                      )}
                      {msg.text ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      ) : (
                        !loading && null
                      )}
                    </>
                  ) : (
                    msg.text
                  )}
                </div>
              </li>
            ))}
            {loading && !messages.at(-1)?.text && !messages.at(-1)?.toolCalls?.length && (
              <li className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </li>
            )}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 max-h-40 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 transition-opacity disabled:opacity-30 hover:opacity-80"
            aria-label="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.105 3.105a.75.75 0 0 1 .815-.156l13.5 6a.75.75 0 0 1 0 1.4l-13.5 6a.75.75 0 0 1-1.03-.892L4.927 10 2.89 4.543a.75.75 0 0 1 .215-.438Z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
