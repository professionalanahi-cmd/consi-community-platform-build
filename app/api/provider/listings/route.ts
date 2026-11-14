import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { requireRole } from '@/lib/server/session'
import { db, logReview, newId } from '@/lib/server/store'
import type { Resource } from '@/lib/types'

function statsFor(id: string) {
  const ev = db.events.filter((e) => e.resourceId === id)
  return {
    impressions: ev.filter((e) => e.type === 'impression').length,
    views: ev.filter((e) => e.type === 'view').length,
    referrals: ev.filter((e) => e.type === 'referral').length,
  }
}

export const GET = handle(async () => {
  const { providerId } = await requireRole('provider')
  const provider = db.providers.get(providerId!)
  if (!provider) throw new HttpError(404, 'Provider not found')
  const listings = [...db.resources.values()]
    .filter((r) => r.providerId === providerId && r.status !== 'removed')
    .map((r) => ({ ...r, stats: statsFor(r.id), reviews: db.reviews.filter((v) => v.resourceId === r.id) }))
  return { provider, listings }
})

const createSchema = listingInput.extend({ submit: z.boolean().default(false) })

export const POST = handle(async (req: Request) => {
  const { providerId } = await requireRole('provider')
  const provider = db.providers.get(providerId!)
  if (!provider || provider.status === 'suspended') throw new HttpError(403, 'This organization cannot submit listings')
  const { submit, ...input } = createSchema.parse(await req.json())
  const now = new Date().toISOString()
  const resource: Resource = {
    id: newId('res'),
    providerId: provider.id,
    ...toResourceFields(input),
    organization: input.organization,
    translations: {},
    status: submit ? 'submitted' : 'draft',
    verification: 'unverified',
    source: 'Provider submission',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  }
  db.resources.set(resource.id, resource)
  logReview(resource.id, 'provider', submit ? 'submitted' : 'saved_draft')
  return { listing: resource }
})
