import { z } from 'zod'
import { recordListingStatus } from '@/lib/server/changes'
import { data } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { requireRole } from '@/lib/server/session'

const schema = z.object({
  action: z.enum(['update', 'submit', 'pause', 'resume', 'withdraw']),
  fields: listingInput.optional(),
})

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { providerId } = await requireRole('provider')
  const { id } = await ctx.params
  const r = await data.resources.get(id)
  if (!r || r.providerId !== providerId) throw new HttpError(404, 'Listing not found')
  const { action, fields } = schema.parse(await req.json())
  const now = new Date().toISOString()
  const wasPublished = r.status === 'published'
  const providerSource = `${(await data.providers.get(providerId!))?.name ?? r.organization} (listing provider)`

  switch (action) {
    case 'update': {
      if (!fields) throw new HttpError(400, 'Missing fields')
      Object.assign(r, toResourceFields(fields), { organization: fields.organization, updatedAt: now })
      // Material changes go back through review before residents see them.
      if (r.status === 'published' || r.status === 'approved' || r.status === 'rejected') {
        r.status = 'submitted'
        r.translations = {}
      }
      await data.reviews.log(id, 'provider', 'updated')
      break
    }
    case 'submit':
      if (!['draft', 'rejected'].includes(r.status)) throw new HttpError(400, 'Only drafts can be submitted')
      r.status = 'submitted'
      await data.reviews.log(id, 'provider', 'submitted')
      break
    case 'pause':
      if (r.status !== 'published') throw new HttpError(400, 'Only published listings can be paused')
      r.status = 'paused'
      await data.reviews.log(id, 'provider', 'paused')
      await recordListingStatus(r, 'listed', 'paused', providerSource)
      break
    case 'resume':
      if (r.status !== 'paused') throw new HttpError(400, 'Listing is not paused')
      r.status = 'published'
      await data.reviews.log(id, 'provider', 'resumed')
      await recordListingStatus(r, 'paused', 'listed', providerSource)
      break
    case 'withdraw':
      r.status = 'removed'
      await data.reviews.log(id, 'provider', 'withdrawn')
      if (wasPublished) await recordListingStatus(r, 'listed', 'removed', providerSource)
      break
  }
  r.updatedAt = now
  return { listing: await data.resources.save(r) }
})
