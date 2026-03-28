export const runtime = 'nodejs'

import { GoogleGenAI, Content, createPartFromFunctionResponse } from '@google/genai'
import { NextRequest } from 'next/server'
import { initMCPClients, getAllFunctionDeclarations, callMCPTool } from '@/lib/mcp/client'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const MODEL = 'gemini-2.0-flash'
const MAX_ITERATIONS = 10

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
  const { messages } = (await request.json()) as { messages: ChatMessage[] }

  await initMCPClients()
  const functionDeclarations = getAllFunctionDeclarations()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const contents: Content[] = buildContents(messages)
        const tools = functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: tools ? { tools } : undefined,
          })

          const functionCalls = response.functionCalls ?? []

          if (functionCalls.length === 0) {
            emit(controller, { type: 'text', text: response.text })
            break
          }

          // Append model's function-call turn
          contents.push({
            role: 'model',
            parts: functionCalls.map((fc) => ({ functionCall: fc })),
          })

          // Execute each tool call and collect results
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

          // Append function-response turn
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
