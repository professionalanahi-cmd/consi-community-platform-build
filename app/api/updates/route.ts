import { handle } from '@/lib/server/http'
import { DEFAULT_PREFS } from '@/lib/prefs'
import { getGuestId } from '@/lib/server/session'
import { db, guest, publishedResources } from '@/lib/server/store'

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  const notify = (g.prefs ?? DEFAULT_PREFS).notify
  const now = Date.now()
  const items: { id: string; kind: 'newResource' | 'deadlineSoon' | 'needsReview'; resourceId: string; date: string }[] = []

  if (notify.newResources) {
    for (const r of publishedResources()) {
      if (now - new Date(r.updatedAt).getTime() < 14 * 86400000) items.push({ id: `new-${r.id}`, kind: 'newResource', resourceId: r.id, date: r.updatedAt })
    }
  }
  if (notify.deadlines) {
    const pool = g.saved.length ? g.saved.map((id) => db.resources.get(id)).filter(Boolean) : publishedResources()
    for (const r of pool) {
      if (r?.deadline) {
        const ms = new Date(r.deadline).getTime() - now
        if (ms > 0 && ms < 30 * 86400000) items.push({ id: `dl-${r.id}`, kind: 'deadlineSoon', resourceId: r.id, date: r.deadline })
      }
    }
  }
  if (notify.contactChanges || notify.availabilityChanges) {
    for (const id of g.saved) {
      const r = db.resources.get(id)
      if (r?.verification === 'needs_review') items.push({ id: `rv-${r.id}`, kind: 'needsReview', resourceId: r.id, date: r.updatedAt })
    }
  }
  const resources = Object.fromEntries(items.map((i) => [i.resourceId, db.resources.get(i.resourceId)]))
  return { items: items.slice(0, 20), resources }
})
