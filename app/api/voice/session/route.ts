import { handle } from '@/lib/server/http'

/**
 * Returns credentials for a live ElevenLabs Agents conversation, or demo mode.
 * The API key never leaves the server; the browser receives a short-lived signed URL.
 */
export const GET = handle(async (req: Request) => {
  // ElevenLabs Agents does not support Armenian yet: Armenian uses the typed concierge with ElevenLabs speech.
  if (new URL(req.url).searchParams.get('lang') === 'hy') return { mode: 'demo' as const }
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!agentId) return { mode: 'demo' as const }
  if (!apiKey) return { mode: 'live' as const, agentId }
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { 'xi-api-key': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('[voice] signed url failed', res.status)
    return { mode: 'demo' as const, reason: 'Live voice is temporarily unavailable.' }
  }
  const { signed_url } = (await res.json()) as { signed_url: string }
  return { mode: 'live' as const, signedUrl: signed_url }
})
