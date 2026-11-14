import { z } from 'zod'
import { data, newId } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { listingInput, toResourceFields } from '@/lib/server/listings'
import { requireRole } from '@/lib/server/session'
import type { Resource } from '@/lib/types'

export const GET = handle(async () => {
  const { providerId } = await requireRole('provider')
  const provider = await data.providers.get(providerId!)
  if (!provider) throw new HttpError(404, 'Provider not found')
  const owned = (await data.resources.list({ providerId: provider.id })).filter((r) => r.status !== 'removed')
  const stats = await data.activity.statsFor(owned.map((r) => r.id))
  const listings = await Promise.all(
    owned.map(async (r) => ({ ...r, stats: stats[r.id], reviews: await data.reviews.listForResource(r.id) })),
  )
  return { provider, listings }
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
  return { listing: resource }
})
