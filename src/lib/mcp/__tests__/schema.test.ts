import { describe, it, expect, beforeEach } from 'vitest'
import { Type } from '@google/genai'
import { mcpToolToFunctionDeclaration, toolToServer } from '../schema'
import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js'

function makeTool(overrides: Partial<MCPTool> = {}): MCPTool {
  return {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {}, required: [] },
    ...overrides,
  }
}

describe('mcpToolToFunctionDeclaration', () => {
  beforeEach(() => toolToServer.clear())

  it('prefixes the tool name with the server name', () => {
    const decl = mcpToolToFunctionDeclaration(makeTool({ name: 'query' }), 'postgres')
    expect(decl.name).toBe('postgres__query')
  })

  it('registers the tool in toolToServer', () => {
    mcpToolToFunctionDeclaration(makeTool({ name: 'list_tables' }), 'postgres')
    expect(toolToServer.get('postgres__list_tables')).toBe('postgres')
  })

  it('preserves the tool description', () => {
    const decl = mcpToolToFunctionDeclaration(
      makeTool({ description: 'Lists all tables' }),
      'postgres'
    )
    expect(decl.description).toBe('Lists all tables')
  })

  it('converts a string property', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: { sql: { type: 'string', description: 'SQL query' } },
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    expect(decl.parameters?.properties?.sql).toMatchObject({
      type: Type.STRING,
      description: 'SQL query',
    })
  })

  it('converts an integer property', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'integer' } },
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    expect(decl.parameters?.properties?.limit).toMatchObject({ type: Type.INTEGER })
  })

  it('converts a boolean property', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: { verbose: { type: 'boolean' } },
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    expect(decl.parameters?.properties?.verbose).toMatchObject({ type: Type.BOOLEAN })
  })

  it('converts an array property with typed items', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: {
          columns: { type: 'array', items: { type: 'string' } },
        },
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    expect(decl.parameters?.properties?.columns).toMatchObject({
      type: Type.ARRAY,
      items: { type: Type.STRING },
    })
  })

  it('converts nested object properties', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: { column: { type: 'string' }, value: { type: 'number' } },
          },
        },
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    const filter = decl.parameters?.properties?.filter as { type: string; properties: Record<string, unknown> }
    expect(filter.type).toBe(Type.OBJECT)
    expect(filter.properties.column).toMatchObject({ type: Type.STRING })
    expect(filter.properties.value).toMatchObject({ type: Type.NUMBER })
  })

  it('passes required fields through', () => {
    const tool = makeTool({
      inputSchema: {
        type: 'object',
        properties: { sql: { type: 'string' } },
        required: ['sql'],
      },
    })
    const decl = mcpToolToFunctionDeclaration(tool, 'postgres')
    expect(decl.parameters?.required).toEqual(['sql'])
  })
})
