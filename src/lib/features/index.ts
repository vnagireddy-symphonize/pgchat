import defaults from '../../../features.json'

export interface FeatureFlags {
  mcpTools:          boolean
  systemPrompt:      boolean
  markdownRendering: boolean
  suggestions:       boolean
  chartView:         boolean
}

export type ServerFeatureKey = 'mcpTools' | 'systemPrompt'
export type ClientFeatureKey = 'markdownRendering' | 'suggestions' | 'chartView'

export const featureDefaults: FeatureFlags = defaults

const ENV_MAP: Record<ServerFeatureKey, string> = {
  mcpTools:     'FEATURE_MCP_TOOLS',
  systemPrompt: 'FEATURE_SYSTEM_PROMPT',
}

/** Applies env var overrides on top of the client-sent server flags. */
export function resolveServerFlags(
  clientFlags: Pick<FeatureFlags, ServerFeatureKey>
): Pick<FeatureFlags, ServerFeatureKey> {
  const result = { ...clientFlags }
  for (const [key, envVar] of Object.entries(ENV_MAP) as [ServerFeatureKey, string][]) {
    const raw = process.env[envVar]
    if (raw !== undefined) {
      result[key] = raw.toLowerCase() !== 'false'
    }
  }
  return result
}
