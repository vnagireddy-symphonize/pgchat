import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadMCPConfig } from '../config'

// Mock fs so tests don't touch the real filesystem
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => { throw new Error('ENOENT') }),
  },
}))

// Mock the base config import
vi.mock('../../../../mcp.config.json', () => ({
  default: {
    servers: [
      {
        name: 'postgres',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-postgres@latest'],
        env: { DATABASE_URL: '${DATABASE_URL}' },
      },
    ],
  },
}))

describe('loadMCPConfig', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
    vi.clearAllMocks()
  })

  it('resolves ${ENV_VAR} placeholders from process.env', () => {
    const config = loadMCPConfig()
    const server = config.servers[0]
    if (server.transport !== 'stdio') throw new Error('Expected stdio')
    expect(server.env?.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/testdb')
  })

  it('keeps the literal value when env var is not set', () => {
    delete process.env.DATABASE_URL
    const config = loadMCPConfig()
    const server = config.servers[0]
    if (server.transport !== 'stdio') throw new Error('Expected stdio')
    expect(server.env?.DATABASE_URL).toBe('${DATABASE_URL}')
  })

  it('returns the server name and transport unchanged', () => {
    const config = loadMCPConfig()
    const server = config.servers[0]
    expect(server.name).toBe('postgres')
    expect(server.transport).toBe('stdio')
  })

  it('falls back to base config when local file is missing', () => {
    const config = loadMCPConfig()
    expect(config.servers).toHaveLength(1)
  })
})
