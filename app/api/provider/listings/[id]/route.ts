import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { requireRole } from '@/lib/server/session'
import { db, logReview } from '@/lib/server/store'

const schema = z.object({
  action: z.enum(['update', 'submit', 'pause', 'resume', 'withdraw']),
  fields: listingInput.optional(),
})

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { providerId } = await requireRole('provider')
  const { id } = await ctx.params
  const r = db.resources.get(id)
  if (!r || r.providerId !== providerId) throw new HttpError(404, 'Listing not found')
  const { action, fields } = schema.parse(await req.json())
  const now = new Date().toISOString()

  switch (action) {
    case 'update': {
      if (!fields) throw new HttpError(400, 'Missing fields')
      Object.assign(r, toResourceFields(fields), { organization: fields.organization, updatedAt: now })
      // Material changes go back through review before residents see them.
      if (r.status === 'published' || r.status === 'approved' || r.status === 'rejected') {
        r.status = 'submitted'
        r.translations = {}
      }
      logReview(id, 'provider', 'updated')
      break
    }
    case 'submit':
      if (!['draft', 'rejected'].includes(r.status)) throw new HttpError(400, 'Only drafts can be submitted')
      r.status = 'submitted'
      logReview(id, 'provider', 'submitted')
      break
    case 'pause':
      if (r.status !== 'published') throw new HttpError(400, 'Only published listings can be paused')
      r.status = 'paused'
      logReview(id, 'provider', 'paused')
      break
    case 'resume':
      if (r.status !== 'paused') throw new HttpError(400, 'Listing is not paused')
      r.status = 'published'
      logReview(id, 'provider', 'resumed')
      break
    case 'withdraw':
      r.status = 'removed'
      logReview(id, 'provider', 'withdrawn')
      break
  }
  r.updatedAt = now
  return { listing: r }
})
