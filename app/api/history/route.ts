import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { guest } from '@/lib/server/store'
import type { SearchHistorySummary } from '@/lib/types'

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  const entries: SearchHistorySummary[] = g.history.map(({ response: _response, ...summary }) => summary)
  return { entries }
})
