import { handle } from '@/lib/server/http'
import { gisStatus } from '@/lib/server/gis'
import { requireRole } from '@/lib/server/session'
import { data } from '@/lib/server/data'
import { CATEGORIES } from '@/lib/types'

export const GET = handle(async () => {
  await requireRole('admin')
  const [resources, providers, reviews, searches] = await Promise.all([
    data.resources.list(),
    data.providers.list(),
    data.reviews.listRecent(50),
    data.activity.listSearches(),
  ])
  const now = Date.now()
  const allStats = await data.activity.statsFor(resources.map((r) => r.id))
  const stats = (id: string) => allStats[id]

  const demand = CATEGORIES.map((c) => {
    const rows = searches.filter((s) => s.categories.includes(c))
    return { category: c, searches: rows.length, zeroResults: rows.filter((s) => s.resultCount === 0).length }
  })
    .filter((d) => d.searches > 0)
    .sort((a, b) => b.searches - a.searches)

  const gapMap = new Map<string, { zip: string; category: string; count: number }>()
  for (const s of searches.filter((x) => x.resultCount <= 1)) {
    for (const c of s.categories) {
      const key = `${s.zip ?? 'unknown'}:${c}`
      const g = gapMap.get(key) ?? { zip: s.zip ?? 'Unknown', category: c, count: 0 }
      g.count++
      gapMap.set(key, g)
    }
  }

  const ruleCounts: Record<string, number> = {}
  for (const s of searches) for (const r of s.unconfirmedRules) ruleCounts[r] = (ruleCounts[r] ?? 0) + 1

  const published = resources.filter((r) => r.status === 'published')
  const lowPerforming = published
    .map((r) => ({ id: r.id, name: r.name, ...stats(r.id) }))
    .filter((r) => r.impressions >= 5 || r.impressions === 0)
    .map((r) => ({ ...r, viewRate: r.impressions ? r.views / r.impressions : 0 }))
    .sort((a, b) => a.viewRate - b.viewRate)
    .slice(0, 4)

  const stale = published.filter((r) => r.verification === 'needs_review' || !r.lastVerified || now - new Date(r.lastVerified).getTime() > 180 * 86400000)

  return {
    queue: resources.filter((r) => r.status === 'submitted' || r.status === 'under_review'),
    listings: resources.map((r) => ({ ...r, stats: stats(r.id) })),
    providers,
    reviews,
    insights: {
      totalSearches: searches.length,
      demand,
      gaps: [...gapMap.values()].sort((a, b) => b.count - a.count).slice(0, 6),
      unconfirmedRules: Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]),
      lowPerforming,
      staleCount: stale.length,
      stale: stale.map((r) => ({ id: r.id, name: r.name, lastVerified: r.lastVerified ?? null })),
    },
    integrations: {
      ai: 'Vercel AI Gateway',
      voice: process.env.ELEVENLABS_AGENT_ID ? 'live' : 'demo',
      gis: gisStatus(),
      database: data.label,
    },
  }
})
