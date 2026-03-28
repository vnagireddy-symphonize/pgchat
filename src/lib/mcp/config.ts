import fs from 'fs'
import path from 'path'
import baseConfig from '../../../mcp.config.json'

export interface McpServerConfig {
  name: string
  transport: 'streamable-http'
  url: string
  requestInit?: {
    headers?: Record<string, string>
  }
}

interface McpConfig {
  servers: McpServerConfig[]
}

function resolveEnvVars(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => {
      const match = v.match(/^\$\{(.+)\}$/)
      return [k, match ? (process.env[match[1]] ?? v) : v]
    })
  )
}

export function loadMCPConfig(): McpConfig {
  let config: McpConfig = baseConfig as McpConfig

  // Prefer mcp.config.local.json when present (gitignored)
  try {
    const localPath = path.resolve(process.cwd(), 'mcp.config.local.json')
    const raw = fs.readFileSync(localPath, 'utf-8')
    config = JSON.parse(raw) as McpConfig
  } catch {
    // no local override
  }

  return {
    servers: config.servers.map((s) => ({
      ...s,
      requestInit: s.requestInit
        ? {
            ...s.requestInit,
            headers: s.requestInit.headers
              ? resolveEnvVars(s.requestInit.headers)
              : undefined,
          }
        : undefined,
    })),
  }
}
