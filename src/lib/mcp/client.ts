import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ToolListChangedNotificationSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

type CallToolResult = z.infer<typeof CallToolResultSchema>
import { FunctionDeclaration } from '@google/genai'
import { loadMCPConfig } from './config'
import { mcpToolToFunctionDeclaration, toolToServer } from './schema'

interface ServerEntry {
  client: Client
  declarations: FunctionDeclaration[]
}

const registry = new Map<string, ServerEntry>()
let initPromise: Promise<void> | null = null

async function connectServer(name: string, url: string, requestInit?: RequestInit) {
  const client = new Client({ name: 'pgchat', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit })

  await client.connect(transport)
  const { tools } = await client.listTools()

  const declarations = tools.map((t) => mcpToolToFunctionDeclaration(t, name))
  registry.set(name, { client, declarations })

  // Refresh tool list when the server signals changes
  client.setNotificationHandler(
    ToolListChangedNotificationSchema,
    async () => {
      try {
        const { tools: updated } = await client.listTools()
        const updatedDeclarations = updated.map((t) => mcpToolToFunctionDeclaration(t, name))
        registry.set(name, { client, declarations: updatedDeclarations })
      } catch (err) {
        console.warn(`[mcp] failed to refresh tools for ${name}:`, err)
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
        connectServer(s.name, s.url, s.requestInit as RequestInit | undefined).catch((err) => {
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

  // Strip server prefix before calling the actual MCP server
  const toolName = qualifiedName.slice(serverName.length + 2)
  const result = (await entry.client.callTool({ name: toolName, arguments: args })) as CallToolResult

  return (result.content as Array<{ type: string; text?: string }>)
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('\n')
}
