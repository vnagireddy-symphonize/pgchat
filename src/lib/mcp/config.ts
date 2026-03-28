import fs from 'fs'
import path from 'path'
import baseConfig from '../../../mcp.config.json'

export type McpTransport = 'streamable-http' | 'stdio'

interface BaseServerConfig {
  name: string
  transport: McpTransport
}

interface StreamableHttpServerConfig extends BaseServerConfig {
  transport: 'streamable-http'
  url: string
  requestInit?: {
    headers?: Record<string, string>
  }
}

interface StdioServerConfig extends BaseServerConfig {
  transport: 'stdio'
  command: string
  args?: string[]
  env?: Record<string, string>
}

export type McpServerConfig = StreamableHttpServerConfig | StdioServerConfig

interface McpConfig {
  servers: McpServerConfig[]
}

function resolveEnvVars(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => {
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
    servers: config.servers.map((s) => {
      if (s.transport === 'stdio') {
        return {
          ...s,
          env: s.env ? resolveEnvVars(s.env) : undefined,
        } as StdioServerConfig
      }
      // streamable-http
      const h = s as StreamableHttpServerConfig
      return {
        ...h,
        requestInit: h.requestInit
          ? {
              ...h.requestInit,
              headers: h.requestInit.headers
                ? resolveEnvVars(h.requestInit.headers)
                : undefined,
            }
          : undefined,
      }
    }),
  }
}
