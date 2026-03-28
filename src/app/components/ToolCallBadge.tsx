'use client'

import { useState } from 'react'

interface ToolCallBadgeProps {
  name: string
  args: Record<string, unknown>
  result?: string
}

export default function ToolCallBadge({ name, args, result }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  // Strip server prefix for display
  const displayName = name.includes('__') ? name.split('__').slice(1).join('__') : name

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
      >
        {result === undefined ? (
          <span className="w-2 h-2 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
        ) : (
          <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="font-mono">{displayName}</span>
        <span className="text-zinc-400 dark:text-zinc-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono overflow-auto max-h-48">
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
            args
          </div>
          <pre className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{JSON.stringify(args, null, 2)}</pre>
          {result !== undefined && (
            <>
              <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 text-zinc-500">
                result
              </div>
              <pre className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{result}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
