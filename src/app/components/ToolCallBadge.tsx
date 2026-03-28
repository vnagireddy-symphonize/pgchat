'use client'

import { useState } from 'react'

interface ToolCallBadgeProps {
  name: string
  args: Record<string, unknown>
  result?: string
}

export default function ToolCallBadge({ name, args, result }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  const displayName = name.includes('__') ? name.split('__').slice(1).join('__') : name
  const isPending = result === undefined
  const isError = result?.startsWith('Error:')

  return (
    <div className="text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 border transition-colors font-mono ${
          isPending
            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
            : isError
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
        }`}
      >
        {isPending ? (
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
        ) : isError ? (
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 4v3M6 8.5v.5M2 10h8L6 2 2 10z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
        <span>{displayName}</span>
        <span className="opacity-50 text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-[11px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 font-sans font-medium uppercase tracking-wide text-[10px]">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="10" height="8" rx="1.5" />
              <path d="M1 5h10" />
            </svg>
            Arguments
          </div>
          <pre className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 overflow-auto max-h-36">{JSON.stringify(args, null, 2)}</pre>
          {result !== undefined && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-t border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 font-sans font-medium uppercase tracking-wide text-[10px]">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h8M2 8h5" strokeLinecap="round" />
                </svg>
                Result
              </div>
              <pre className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 overflow-auto max-h-36 whitespace-pre-wrap">{result}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
