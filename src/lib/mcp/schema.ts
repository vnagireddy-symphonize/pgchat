import { FunctionDeclaration, Schema, Type } from '@google/genai'
import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

// Maps tool name → server name for dispatch
export const toolToServer = new Map<string, string>()

function convertSchema(node: Record<string, unknown>): Schema {
  const type = node.type as string | undefined

  switch (type) {
    case 'string':
      return { type: Type.STRING, description: node.description as string | undefined }
    case 'integer':
      return { type: Type.INTEGER, description: node.description as string | undefined }
    case 'number':
      return { type: Type.NUMBER, description: node.description as string | undefined }
    case 'boolean':
      return { type: Type.BOOLEAN, description: node.description as string | undefined }
    case 'array': {
      const items = node.items as Record<string, unknown> | undefined
      return {
        type: Type.ARRAY,
        description: node.description as string | undefined,
        items: items ? convertSchema(items) : undefined,
      }
    }
    case 'object':
    default: {
      const props = node.properties as Record<string, Record<string, unknown>> | undefined
      return {
        type: Type.OBJECT,
        description: node.description as string | undefined,
        properties: props
          ? Object.fromEntries(Object.entries(props).map(([k, v]) => [k, convertSchema(v)]))
          : undefined,
        required: node.required as string[] | undefined,
      }
    }
  }
}

export function mcpToolToFunctionDeclaration(
  tool: MCPTool,
  serverName: string
): FunctionDeclaration {
  // Prefix with server name to avoid collisions across servers
  const qualifiedName = `${serverName}__${tool.name}`
  toolToServer.set(qualifiedName, serverName)

  return {
    name: qualifiedName,
    description: tool.description,
    parameters: convertSchema(tool.inputSchema as Record<string, unknown>),
  }
}
