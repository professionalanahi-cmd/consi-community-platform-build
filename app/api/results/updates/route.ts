import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { buildUpdates } from '@/lib/server/updates'
import { LANGUAGES, type ResultUpdatesResponse } from '@/lib/types'

export const GET = handle(async (req: Request): Promise<ResultUpdatesResponse> => {
  const lang = z.enum(LANGUAGES).catch('en').parse(new URL(req.url).searchParams.get('lang'))
  const guestId = await getGuestId()
  const [enabled, entry] = await Promise.all([data.guests.getAiUpdates(guestId), data.history.getActive(guestId)])
  const checkedAt = new Date().toISOString()
  if (!enabled || !entry) return { enabled, hasActiveResults: !!entry, items: [], checkedAt }
  return { enabled: true, hasActiveResults: true, items: await buildUpdates(entry, lang), checkedAt }
})

const putSchema = z.object({ enabled: z.boolean() })

/** Only flips the preference. Results and search history are never touched here. */
export const PUT = handle(async (req: Request) => {
  const { enabled } = putSchema.parse(await req.json())
  return { enabled: await data.guests.setAiUpdates(await getGuestId(), enabled) }
})
