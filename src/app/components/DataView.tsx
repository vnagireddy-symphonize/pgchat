'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { Element, Text } from 'hast'

// ── hast helpers ────────────────────────────────────────────────────────────

function collectText(node: Element | Text | { type: string }): string {
  if (node.type === 'text') return (node as Text).value
  if ('children' in node) {
    return (node as Element).children.map(collectText).join('')
  }
  return ''
}

function rowCells(tr: Element): string[] {
  return tr.children
    .filter((c): c is Element => c.type === 'element' && (c.tagName === 'th' || c.tagName === 'td'))
    .map(collectText)
}

export function extractTableData(node: Element): { headers: string[]; rows: string[][] } {
  const thead = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'thead') as Element | undefined
  const tbody = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'tbody') as Element | undefined

  const headerRow = thead?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'tr') as Element | undefined
  const headers = headerRow ? rowCells(headerRow) : []

  const rows = (tbody?.children ?? [])
    .filter((c): c is Element => c.type === 'element' && c.tagName === 'tr')
    .map(rowCells)

  return { headers, rows }
}

// ── chart helpers ────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']

function isNumericColumn(col: number, rows: string[][]): boolean {
  const values = rows.map((r) => r[col]).filter((v) => v !== '' && v != null)
  return values.length > 0 && values.every((v) => !isNaN(parseFloat(v)) && isFinite(Number(v)))
}

// ── DataView ────────────────────────────────────────────────────────────────

interface DataViewProps {
  headers: string[]
  rows: string[][]
}

type ViewType = 'table' | 'bar' | 'line'

export default function DataView({ headers, rows }: DataViewProps) {
  const [view, setView] = useState<ViewType>('table')

  const { xKey, numericKeys, chartData, hasChart } = useMemo(() => {
    const numericCols = headers.map((_, i) => isNumericColumn(i, rows))
    const xIndex = numericCols.findIndex((n) => !n) === -1 ? 0 : numericCols.findIndex((n) => !n)
    const xKey = headers[xIndex] ?? headers[0]
    const numericKeys = headers.filter((h, i) => numericCols[i] && h !== xKey)

    const chartData = rows.map((row) => {
      const obj: Record<string, string | number> = {}
      headers.forEach((h, i) => {
        obj[h] = numericCols[i] ? parseFloat(row[i]) : row[i]
      })
      return obj
    })

    return { xKey, numericKeys, chartData, hasChart: numericKeys.length > 0 }
  }, [headers, rows])

  const views: { key: ViewType; label: string }[] = [
    { key: 'table', label: 'Table' },
    { key: 'bar', label: 'Bar' },
    { key: 'line', label: 'Line' },
  ]

  return (
    <div className="my-2 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {headers.length} column{headers.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-1">
          {views.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              disabled={key !== 'table' && !hasChart}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                view === key
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart view */}
      {(view === 'bar' || view === 'line') && hasChart && (
        <div className="px-2 py-4 bg-white dark:bg-zinc-950">
          <ResponsiveContainer width="100%" height={260}>
            {view === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {numericKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {numericKeys.map((key, i) => (
                  <Line key={key} dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
