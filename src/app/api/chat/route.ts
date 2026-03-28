export const runtime = 'nodejs'

import { GoogleGenAI, Content, createPartFromFunctionResponse } from '@google/genai'
import { NextRequest } from 'next/server'
import { FunctionDeclaration } from '@google/genai'
import { initMCPClients, getAllFunctionDeclarations, callMCPTool } from '@/lib/mcp/client'
import { featureDefaults, resolveServerFlags, FeatureFlags } from '@/lib/features'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const MODEL = 'gemini-2.0-flash'
const MAX_ITERATIONS = 20

const SYSTEM_PROMPT = `You are an expert data analyst with direct access to a PostgreSQL database.

When the user asks a question:
1. Start by exploring the schema — list tables and describe relevant ones before querying.
2. Write precise SQL queries to retrieve the data needed.
3. Analyse the results: identify trends, outliers, distributions, aggregates, and correlations.
4. Provide a clear, structured answer with statistical insights — don't just echo raw data.
5. If a question is ambiguous, make a reasonable assumption and state it.
6. When relevant, suggest follow-up analyses the user might find useful.

Always reason step-by-step before writing SQL. Prefer readable, well-commented queries.`

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

function buildContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))
}

function emit(controller: ReadableStreamDefaultController, event: unknown) {
  controller.enqueue(JSON.stringify(event) + '\n')
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    messages: ChatMessage[]
    features?: Pick<FeatureFlags, 'mcpTools' | 'systemPrompt'>
  }

  const serverFlags = resolveServerFlags({
    mcpTools:     body.features?.mcpTools     ?? featureDefaults.mcpTools,
    systemPrompt: body.features?.systemPrompt ?? featureDefaults.systemPrompt,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        let functionDeclarations: FunctionDeclaration[] = []
        if (serverFlags.mcpTools) {
          await initMCPClients()
          functionDeclarations = getAllFunctionDeclarations()
        }

        const contents: Content[] = buildContents(body.messages)
        const tools = functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
              ...(serverFlags.systemPrompt ? { systemInstruction: SYSTEM_PROMPT } : {}),
              ...(tools ? { tools } : {}),
            },
          })

          const functionCalls = response.functionCalls ?? []

          if (functionCalls.length === 0) {
            emit(controller, { type: 'text', text: response.text })
            break
          }

          contents.push({
            role: 'model',
            parts: functionCalls.map((fc) => ({ functionCall: fc })),
          })

          const responseParts = await Promise.all(
            functionCalls.map(async (fc) => {
              const args = (fc.args ?? {}) as Record<string, unknown>
              enqueue({ type: 'tool_call', name: fc.name, args })

              let result: string
              try {
                result = await callMCPTool(fc.name!, args)
              } catch (err) {
                result = `Error: ${err instanceof Error ? err.message : String(err)}`
              }

              enqueue({ type: 'tool_result', name: fc.name, result })
              return createPartFromFunctionResponse(fc.id ?? fc.name!, fc.name!, { output: result })
            })
          )

          contents.push({ role: 'user', parts: responseParts })
        }
      } catch (err) {
        emit(controller, { type: 'error', message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
