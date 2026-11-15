import { DEFAULT_PREFS } from '@/lib/prefs'
import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { LIVE_API, liveEnabled, toResource, type LiveResource } from '@/lib/server/live'

type Item = { id: string; kind: 'newResource' | 'deadlineSoon' | 'needsReview'; resourceId: string; date: string }

/** Real updates from the live engine: listings providers published, and listings whose details may be out of date. */
async function liveUpdates(lang: string) {
  const res = await fetch(`${LIVE_API}/api/resources?lang=${encodeURIComponent(lang)}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`engine updates ${res.status}`)
  const { resources } = (await res.json()) as { resources: LiveResource[] }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const items: Item[] = []
  for (const r of resources) {
    if (r.sourceLabel === 'provider') items.push({ id: `new-${r.id}`, kind: 'newResource', resourceId: r.id, date: r.confidence.lastCheckedAt ?? today })
  }
  for (const r of resources) {
    if (r.confidence.status === 'outdated' || r.confidence.status === 'unknown')
      items.push({ id: `rv-${r.id}`, kind: 'needsReview', resourceId: r.id, date: r.confidence.lastCheckedAt ?? r.confidence.lastVerifiedAt ?? today })
  }
  const shown = items.slice(0, 20)
  const ids = new Set(shown.map((i) => i.resourceId))
  return { items: shown, resources: Object.fromEntries(resources.filter((r) => ids.has(r.id)).map((r) => [r.id, toResource(r)])) }
}

export const GET = handle(async (req: Request) => {
  if (liveEnabled()) {
    try {
      return await liveUpdates(new URL(req.url).searchParams.get('lang') ?? 'en')
    } catch (e) {
      console.error('[updates] live engine unavailable, using sample updates', e)
    }
  }
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
