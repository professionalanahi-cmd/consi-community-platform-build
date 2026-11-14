import { LIVE_API, liveEnabled } from '@/lib/server/live'

export const maxDuration = 30

/** Speech-to-text for languages the browser cannot recognise (Armenian): ElevenLabs Scribe via the live engine. */
export async function POST(req: Request) {
  if (!liveEnabled()) return Response.json({ text: null })
  try {
    const form = await req.formData()
    const res = await fetch(`${LIVE_API}/api/voice/stt`, { method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(25000) })
    return Response.json(await res.json())
  } catch {
    return Response.json({ text: null })
  }
}
