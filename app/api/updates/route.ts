import { DEFAULT_PREFS } from '@/lib/prefs'
import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'

export const GET = handle(async () => {
  const guestId = await getGuestId()
  const [prefs, savedIds] = await Promise.all([data.guests.getPrefs(guestId), data.guests.listSaved(guestId)])
  const notify = (prefs ?? DEFAULT_PREFS).notify
  const now = Date.now()
  const items: { id: string; kind: 'newResource' | 'deadlineSoon' | 'needsReview'; resourceId: string; date: string }[] = []

  const published = await data.resources.list({ status: 'published' })
  const saved = await data.resources.getMany(savedIds)

  if (notify.newResources) {
    for (const r of published) {
      if (now - new Date(r.updatedAt).getTime() < 14 * 86400000) items.push({ id: `new-${r.id}`, kind: 'newResource', resourceId: r.id, date: r.updatedAt })
    }
  }
  if (notify.deadlines) {
    for (const r of savedIds.length ? saved : published) {
      if (r.deadline) {
        const ms = new Date(r.deadline).getTime() - now
        if (ms > 0 && ms < 30 * 86400000) items.push({ id: `dl-${r.id}`, kind: 'deadlineSoon', resourceId: r.id, date: r.deadline })
      }
    }
  }
  if (notify.contactChanges || notify.availabilityChanges) {
    for (const r of saved) {
      if (r.verification === 'needs_review') items.push({ id: `rv-${r.id}`, kind: 'needsReview', resourceId: r.id, date: r.updatedAt })
    }
  }
  const shown = items.slice(0, 20)
  const resources = Object.fromEntries((await data.resources.getMany([...new Set(shown.map((i) => i.resourceId))])).map((r) => [r.id, r]))
  return { items: shown, resources }
})
