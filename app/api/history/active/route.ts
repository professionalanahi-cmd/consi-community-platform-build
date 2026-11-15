import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'

export const GET = handle(async () => {
  return { entry: await data.history.getActive(await getGuestId()) }
})

/** Clears the active Results tab only. History entries are intentionally left untouched. */
export const DELETE = handle(async () => {
  await data.history.clearActive(await getGuestId())
  return { entry: null }
})
