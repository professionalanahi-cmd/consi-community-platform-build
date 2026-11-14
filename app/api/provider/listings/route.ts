import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { livePublish, liveStats } from '@/lib/server/live'
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
  // Listings published into the live engine get their real impression and referral counts from it.
  const live = await liveStats()
  const listings = [...db.resources.values()]
    .filter((r) => r.providerId === providerId && r.status !== 'removed')
    .map((r) => {
      const reviews = db.reviews.filter((v) => v.resourceId === r.id)
      const liveId = reviews.find((v) => v.action === 'published_live')?.note
      const local = statsFor(r.id)
      const remote = liveId ? live[liveId] : undefined
      return { ...r, stats: remote ? { impressions: local.impressions + remote.shown, views: local.views, referrals: local.referrals + remote.referrals } : local, reviews }
    })
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
  // When the provider confirms, the listing also goes into the live engine (marked "Posted by the provider",
  // status Potential) so residents can find it right away in any language.
  if (submit) {
    const liveId = await livePublish(resource)
    if (liveId) logReview(resource.id, 'provider', 'published_live', liveId)
  }
  return { listing: resource }
})
