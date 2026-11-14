import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { db, guest } from '@/lib/server/store'

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  return {
    ids: g.saved,
    resources: g.saved.map((id) => db.resources.get(id)).filter((r) => r && r.status === 'published'),
  }
})

const body = z.object({ resourceId: z.string().max(64) })

export const POST = handle(async (req: Request) => {
  const { resourceId } = body.parse(await req.json())
  if (!db.resources.has(resourceId)) throw new HttpError(404, 'Resource not found')
  const g = guest(await getGuestId())
  if (!g.saved.includes(resourceId)) g.saved.unshift(resourceId)
  return { ids: g.saved }
})

export const DELETE = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id')
  const g = guest(await getGuestId())
  g.saved = g.saved.filter((s) => s !== id)
  return { ids: g.saved }
})
