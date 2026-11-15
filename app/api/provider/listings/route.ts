import { z } from 'zod'
import { data, newId } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { livePublish, liveProviderListings, liveStats } from '@/lib/server/live'
import { requireRole } from '@/lib/server/session'
import type { Resource } from '@/lib/types'

export const GET = handle(async () => {
  const { providerId } = await requireRole('provider')
  const provider = await data.providers.get(providerId!)
  if (!provider) throw new HttpError(404, 'Provider not found')
  const owned = (await data.resources.list({ providerId: provider.id })).filter((r) => r.status !== 'removed')
  const stats = await data.activity.statsFor(owned.map((r) => r.id))
  // Listings published into the live engine get their real impression and referral counts from it.
  const live = await liveStats()
  const local = await Promise.all(
    owned.map(async (r) => {
      const reviews = await data.reviews.listForResource(r.id)
      const liveId = reviews.find((v) => v.action === 'published_live')?.note
      const mine = stats[r.id] ?? { impressions: 0, views: 0, referrals: 0 }
      const remote = liveId ? live[liveId] : undefined
      return { ...r, stats: remote ? { impressions: mine.impressions + remote.shown, views: mine.views, referrals: mine.referrals + remote.referrals } : mine, reviews }
    }),
  )
  // Add anything this organization published to the engine that this server instance no longer remembers.
  const linked = new Set(local.flatMap((l) => l.reviews.filter((v) => v.action === 'published_live').map((v) => v.note)))
  const remote = (await liveProviderListings(provider.name.replace(/\s*\(Sample\)\s*$/i, ''), provider.id)).filter((r) => !linked.has(r.id))
  return { provider, listings: [...remote, ...local] }
})

const createSchema = listingInput.extend({ submit: z.boolean().default(false) })

export const POST = handle(async (req: Request) => {
  const { providerId } = await requireRole('provider')
  const provider = await data.providers.get(providerId!)
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
  await data.resources.save(resource)
  await data.reviews.log(resource.id, 'provider', submit ? 'submitted' : 'saved_draft')
  // When the provider confirms, the listing also goes into the live engine (marked "Posted by the provider",
  // status Potential) so residents can find it right away in any language.
  if (submit) {
    const liveId = await livePublish(resource)
    if (liveId) await data.reviews.log(resource.id, 'provider', 'published_live', liveId)
  }
  return { listing: resource }
})
