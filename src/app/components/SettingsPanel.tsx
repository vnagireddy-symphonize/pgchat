'use client'

import { FeatureFlags } from '@/lib/features'

interface SettingsPanelProps {
  flags: FeatureFlags
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void
  onClose: () => void
}

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        {description && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`w-9 h-5 rounded-full transition-colors ${
            checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  )
}

export default function SettingsPanel({ flags, setFlag, onClose }: SettingsPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-72 z-30 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          {/* Server section */}
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Server
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Applied on next send</p>
            </div>
            <ToggleRow
              label="MCP Tool Calling"
              description="Connect to MCP servers and run tools"
              checked={flags.mcpTools}
              onChange={(v) => setFlag('mcpTools', v)}
            />
            <ToggleRow
              label="System Prompt"
              description="Data analyst persona and instructions"
              checked={flags.systemPrompt}
              onChange={(v) => setFlag('systemPrompt', v)}
            />
          </section>

          <div className="border-t border-zinc-100 dark:border-zinc-800" />

          {/* Display section */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Display
            </h3>
            <ToggleRow
              label="Markdown Rendering"
              description="Render responses with formatting"
              checked={flags.markdownRendering}
              onChange={(v) => setFlag('markdownRendering', v)}
            />
            <ToggleRow
              label="Suggestion Cards"
              description="Show quick-start prompts on empty state"
              checked={flags.suggestions}
              onChange={(v) => setFlag('suggestions', v)}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Settings are saved locally in your browser
          </p>
        </div>
      </div>
    </>
  )
}
