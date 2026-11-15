import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import type { SearchHistorySummary } from '@/lib/types'

export const GET = handle(async () => {
  const history = await data.history.list(await getGuestId())
  const entries: SearchHistorySummary[] = history.map(({ response: _response, ...summary }) => summary)
  return { entries }
})
