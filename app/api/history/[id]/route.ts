import { handle, HttpError } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { guest } from '@/lib/server/store'

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const entry = guest(await getGuestId()).history.find((h) => h.id === id)
  if (!entry) throw new HttpError(404, 'Search not found')
  return { entry }
})
