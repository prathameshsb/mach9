import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { BridgeFilters } from '@/lib/types'

const SYSTEM_PROMPT = `You are a Pennsylvania bridge data assistant. Convert natural language queries into filter parameters for a bridge database containing 23,202 PA bridges.

Available filter fields:
- q: string (search in location/road names/features)
- county: 3-digit PA county code string (must be zero-padded, e.g. "101" not "1")
- condition: "good" | "fair" | "poor" (good = rating 7-9, fair = 5-6, poor = 0-4)
- year_min: number string (minimum year built)
- year_max: number string (maximum year built)
- deficient: "true" (structurally deficient bridges only, leave unset otherwise)
- sort: "overall_cond" | "year_built" | "adt" | "structure_length" | "sufficiency_rating"
- order: "asc" | "desc"

Major PA county codes:
101=Philadelphia, 003=Allegheny (Pittsburgh), 071=Lancaster, 077=Lehigh (Allentown),
079=Luzerne (Scranton/Wilkes-Barre), 091=Montgomery, 017=Bucks, 029=Chester,
045=Delaware, 069=Lackawanna, 095=Northampton, 049=Erie, 133=York,
129=Westmoreland, 125=Washington, 043=Dauphin (Harrisburg), 039=Crawford,
001=Adams (Gettysburg), 011=Berks (Reading), 013=Blair (Altoona), 041=Cumberland,
055=Franklin, 027=Centre (State College), 075=Lebanon, 021=Cambria (Johnstown),
089=Monroe (Poconos), 025=Carbon, 067=Juniata, 051=Fayette

Respond ONLY with valid JSON in this exact format:
{"filters": {...}, "reply": "plain English explanation of what you found or are showing"}

Set only the filters relevant to the user's query. Do not set filters the user didn't ask for.
If the query is conversational or unclear, respond helpfully and set empty filters.`

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({
        reply: 'AI chat is unavailable — add your GEMINI_API_KEY to .env.local to enable this feature.',
        filters: {},
      })
    }

    const body = await request.json()
    const { message, history = [] } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const chatHistory = [
      {
        role: 'user' as const,
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model' as const,
        parts: [{ text: 'Understood. I will respond only with valid JSON containing filters and a reply field.' }],
      },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.content }],
      })),
    ]

    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessage(message)
    const text = result.response.text().trim()

    let filters: BridgeFilters = {}
    let reply = text

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        filters = parsed.filters ?? {}
        reply = parsed.reply ?? text
      }
    } catch {
      // Gemini didn't return parseable JSON — use raw text as reply
    }

    return NextResponse.json({ reply, filters })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
