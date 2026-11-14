import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'

export const GET = handle(async () => {
  const ids = await data.guests.listSaved(await getGuestId())
  const resources = (await data.resources.getMany(ids)).filter((r) => r.status === 'published')
  return { ids, resources }
})

const body = z.object({ resourceId: z.string().max(64) })

export const POST = handle(async (req: Request) => {
  const { resourceId } = body.parse(await req.json())
  if (!(await data.resources.exists(resourceId))) throw new HttpError(404, 'Resource not found')
  return { ids: await data.guests.addSaved(await getGuestId(), resourceId) }
})

export const DELETE = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  return { ids: await data.guests.removeSaved(await getGuestId(), id) }
})
