import { LIVE_API, liveEnabled } from '@/lib/server/live'

export const maxDuration = 30

/**
 * Speech for the concierge and "read results aloud": ElevenLabs audio from the live engine.
 * Answers 204 when it is unavailable, and the browser's own voice is used instead.
 */
export async function POST(req: Request) {
  if (!liveEnabled()) return new Response(null, { status: 204 })
  try {
    const { text, lang } = (await req.json()) as { text?: string; lang?: string }
    const res = await fetch(`${LIVE_API}/api/voice/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: String(text ?? '').slice(0, 700), lang }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok || !res.headers.get('content-type')?.startsWith('audio/')) return new Response(null, { status: 204 })
    return new Response(res.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } })
  } catch {
    return new Response(null, { status: 204 })
  }
}
