import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { requireRole } from '@/lib/server/session'
import { db } from '@/lib/server/store'

const schema = z.object({ status: z.enum(['pending', 'verified', 'suspended']) })

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole('admin')
  const { id } = await ctx.params
  const p = db.providers.get(id)
  if (!p) throw new HttpError(404, 'Provider not found')
  const { status } = schema.parse(await req.json())
  p.status = status
  if (status === 'suspended') {
    for (const r of db.resources.values()) if (r.providerId === id && r.status === 'published') r.status = 'suspended'
  }
  return { provider: p }
})
