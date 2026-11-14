import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { autoTranslate } from '@/lib/server/listings'
import { requireRole } from '@/lib/server/session'
import { db, logReview } from '@/lib/server/store'
import type { ListingStatus } from '@/lib/types'

const schema = z.object({
  action: z.enum(['start_review', 'approve_publish', 'reject', 'pause', 'unpause', 'suspend', 'remove', 'mark_verified', 'flag_review', 'approve_translations']),
  note: z.string().max(1000).optional(),
})

const NEXT: Partial<Record<z.infer<typeof schema>['action'], ListingStatus>> = {
  start_review: 'under_review',
  reject: 'rejected',
  pause: 'paused',
  unpause: 'published',
  suspend: 'suspended',
  remove: 'removed',
}

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole('admin')
  const { id } = await ctx.params
  const r = db.resources.get(id)
  if (!r) throw new HttpError(404, 'Listing not found')
  const { action, note } = schema.parse(await req.json())
  if (action === 'reject' && !note?.trim()) throw new HttpError(400, 'Add a note so the provider knows what to change')
  const now = new Date().toISOString()

  if (action === 'approve_publish') {
    r.status = 'published'
    r.verification = 'verified'
    r.lastVerified = now
    r.source = 'Provider submission, verified by CONSI admin'
    r.translations = await autoTranslate(r)
  } else if (action === 'mark_verified') {
    r.verification = 'verified'
    r.lastVerified = now
  } else if (action === 'flag_review') {
    r.verification = 'needs_review'
  } else if (action === 'approve_translations') {
    for (const t of Object.values(r.translations)) if (t) t.needsReview = false
  } else {
    r.status = NEXT[action]!
  }
  if (note) r.reviewNotes = note
  r.updatedAt = now
  logReview(id, 'admin', action, note)
  return { listing: r }
})
