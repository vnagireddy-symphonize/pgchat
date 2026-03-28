import { describe, it, expect, afterEach } from 'vitest'
import { resolveServerFlags, featureDefaults } from '../index'

afterEach(() => {
  delete process.env.FEATURE_MCP_TOOLS
  delete process.env.FEATURE_SYSTEM_PROMPT
})

describe('featureDefaults', () => {
  it('has all flags set to true by default', () => {
    expect(featureDefaults.mcpTools).toBe(true)
    expect(featureDefaults.systemPrompt).toBe(true)
    expect(featureDefaults.markdownRendering).toBe(true)
    expect(featureDefaults.suggestions).toBe(true)
  })
})

describe('resolveServerFlags', () => {
  it('returns client flags unchanged when no env vars are set', () => {
    const result = resolveServerFlags({ mcpTools: true, systemPrompt: false })
    expect(result).toEqual({ mcpTools: true, systemPrompt: false })
  })

  it('overrides mcpTools when FEATURE_MCP_TOOLS=false', () => {
    process.env.FEATURE_MCP_TOOLS = 'false'
    const result = resolveServerFlags({ mcpTools: true, systemPrompt: true })
    expect(result.mcpTools).toBe(false)
  })

  it('overrides systemPrompt when FEATURE_SYSTEM_PROMPT=false', () => {
    process.env.FEATURE_SYSTEM_PROMPT = 'false'
    const result = resolveServerFlags({ mcpTools: true, systemPrompt: true })
    expect(result.systemPrompt).toBe(false)
  })

  it('treats any non-"false" env var value as true', () => {
    process.env.FEATURE_MCP_TOOLS = '1'
    process.env.FEATURE_SYSTEM_PROMPT = 'true'
    const result = resolveServerFlags({ mcpTools: false, systemPrompt: false })
    expect(result.mcpTools).toBe(true)
    expect(result.systemPrompt).toBe(true)
  })

  it('env var override takes priority over client-sent false', () => {
    process.env.FEATURE_MCP_TOOLS = 'true'
    const result = resolveServerFlags({ mcpTools: false, systemPrompt: false })
    expect(result.mcpTools).toBe(true)
  })
})
