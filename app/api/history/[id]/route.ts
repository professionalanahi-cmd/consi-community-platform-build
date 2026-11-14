import { data } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const entry = await data.history.get(await getGuestId(), id)
  if (!entry) throw new HttpError(404, 'Search not found')
  return { entry }
})
