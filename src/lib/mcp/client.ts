import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ToolListChangedNotificationSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { FunctionDeclaration } from '@google/genai'
import { loadMCPConfig, McpServerConfig } from './config'
import { mcpToolToFunctionDeclaration, toolToServer } from './schema'

type CallToolResult = z.infer<typeof CallToolResultSchema>

interface ServerEntry {
  client: Client
  declarations: FunctionDeclaration[]
}

const registry = new Map<string, ServerEntry>()
let initPromise: Promise<void> | null = null

function buildTransport(cfg: McpServerConfig) {
  if (cfg.transport === 'stdio') {
    return new StdioClientTransport({
      command: cfg.command,
      args: cfg.args,
      env: cfg.env ? { ...process.env, ...cfg.env } as Record<string, string> : undefined,
    })
  }
  return new StreamableHTTPClientTransport(
    new URL(cfg.url),
    { requestInit: cfg.requestInit as RequestInit | undefined }
  )
}

async function connectServer(cfg: McpServerConfig) {
  const client = new Client({ name: 'pgchat', version: '1.0.0' })
  const transport = buildTransport(cfg)

  await client.connect(transport)
  const { tools } = await client.listTools()

  const declarations = tools.map((t) => mcpToolToFunctionDeclaration(t, cfg.name))
  registry.set(cfg.name, { client, declarations })

  client.setNotificationHandler(
    ToolListChangedNotificationSchema,
    async () => {
      try {
        const { tools: updated } = await client.listTools()
        const updatedDeclarations = updated.map((t) => mcpToolToFunctionDeclaration(t, cfg.name))
        registry.set(cfg.name, { client, declarations: updatedDeclarations })
      } catch (err) {
        console.warn(`[mcp] failed to refresh tools for ${cfg.name}:`, err)
      }
    }
  )
}

export async function initMCPClients(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { servers } = loadMCPConfig()
    await Promise.allSettled(
      servers.map((s) =>
        connectServer(s).catch((err) => {
          console.warn(`[mcp] failed to connect to server "${s.name}":`, err)
        })
      )
    )
  })()

  return initPromise
}

export function getAllFunctionDeclarations(): FunctionDeclaration[] {
  return Array.from(registry.values()).flatMap((e) => e.declarations)
}

export async function callMCPTool(
  qualifiedName: string,
  args: Record<string, unknown>
): Promise<string> {
  const serverName = toolToServer.get(qualifiedName)
  if (!serverName) throw new Error(`Unknown tool: ${qualifiedName}`)

  const entry = registry.get(serverName)
  if (!entry) throw new Error(`Server not connected: ${serverName}`)

  const toolName = qualifiedName.slice(serverName.length + 2)
  const result = (await entry.client.callTool({ name: toolName, arguments: args })) as CallToolResult

  return (result.content as Array<{ type: string; text?: string }>)
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('\n')
}
