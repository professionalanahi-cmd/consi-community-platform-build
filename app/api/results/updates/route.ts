import { z } from 'zod'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { guest } from '@/lib/server/store'
import { buildUpdates } from '@/lib/server/updates'
import { LANGUAGES, type ResultUpdatesResponse } from '@/lib/types'

export const GET = handle(async (req: Request): Promise<ResultUpdatesResponse> => {
  const lang = z.enum(LANGUAGES).catch('en').parse(new URL(req.url).searchParams.get('lang'))
  const g = guest(await getGuestId())
  const entry = g.activeHistoryId ? g.history.find((h) => h.id === g.activeHistoryId) : undefined
  const checkedAt = new Date().toISOString()
  if (!g.aiUpdates || !entry) return { enabled: g.aiUpdates, hasActiveResults: !!entry, items: [], checkedAt }
  return { enabled: true, hasActiveResults: true, items: await buildUpdates(entry, lang), checkedAt }
})

const putSchema = z.object({ enabled: z.boolean() })

/** Only flips the preference. Results and search history are never touched here. */
export const PUT = handle(async (req: Request) => {
  const { enabled } = putSchema.parse(await req.json())
  const g = guest(await getGuestId())
  g.aiUpdates = enabled
  return { enabled }
})
