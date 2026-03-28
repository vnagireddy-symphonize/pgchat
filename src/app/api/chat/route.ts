import { GoogleGenAI } from '@google/genai'
import { NextRequest } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(request: NextRequest) {
  const { message } = await request.json()

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: message,
  })

  return Response.json({ reply: response.text })
}
