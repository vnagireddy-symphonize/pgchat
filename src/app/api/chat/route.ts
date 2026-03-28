import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { message } = await request.json()

  // Placeholder — replace with real LLM / DB logic
  const reply = `You said: "${message}"`

  return Response.json({ reply })
}
