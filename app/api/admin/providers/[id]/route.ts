import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { requireRole } from '@/lib/server/session'

const schema = z.object({ status: z.enum(['pending', 'verified', 'suspended']) })

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole('admin')
  const { id } = await ctx.params
  const p = await data.providers.get(id)
  if (!p) throw new HttpError(404, 'Provider not found')
  const { status } = schema.parse(await req.json())
  p.status = status
  await data.providers.save(p)
  if (status === 'suspended') await data.resources.setStatusForProvider(id, 'published', 'suspended')
  return { provider: p }
})
