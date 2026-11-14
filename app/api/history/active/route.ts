import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { guest } from '@/lib/server/store'

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  return { entry: g.history.find((h) => h.id === g.activeHistoryId) ?? null }
})

/** Clears the active Results tab only. History entries are intentionally left untouched. */
export const DELETE = handle(async () => {
  const g = guest(await getGuestId())
  g.activeHistoryId = null
  return { entry: null }
})
