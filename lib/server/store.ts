import 'server-only'
import { SAMPLE_PROVIDERS, SAMPLE_RESOURCES } from '../demo-data'
import type {
  Preferences,
  Provider,
  Reminder,
  Resource,
  ReviewEvent,
  SearchLog,
  TrackEvent,
  TrackEventType,
} from '../types'

/**
 * Demo data store.
 *
 * This in-memory store implements the same operations the production
 * Supabase schema (see scripts/001_schema.sql) supports, so the UI can be
 * exercised end to end before a database is connected. Data resets when the
 * server restarts.
 */

interface GuestData {
  saved: string[]
  reminders: Reminder[]
  prefs: Preferences | null
}

interface DB {
  resources: Map<string, Resource>
  providers: Map<string, Provider>
  reviews: ReviewEvent[]
  events: TrackEvent[]
  searches: SearchLog[]
  guests: Map<string, GuestData>
}

const globalForStore = globalThis as unknown as { __consiDB?: DB }

function seed(): DB {
  const db: DB = {
    resources: new Map(SAMPLE_RESOURCES.map((r) => [r.id, structuredClone(r)])),
    providers: new Map(SAMPLE_PROVIDERS.map((p) => [p.id, structuredClone(p)])),
    reviews: [],
    events: [],
    searches: [],
    guests: new Map(),
  }
  const now = Date.now()
  const day = 86400000
  // Seed a few weeks of aggregate activity so dashboards have something to show.
  const seedRows: [string, number, number, number][] = [
    ['res_harmony_youth', 180, 74, 31],
    ['res_verdugo_guitar', 92, 33, 12],
    ['res_maple_pantry', 260, 140, 66],
    ['res_brightpath_utility', 210, 98, 41],
    ['res_career_launch', 150, 61, 22],
  ]
  for (const [id, imp, views, refs] of seedRows) {
    const push = (type: TrackEventType, n: number) => {
      for (let i = 0; i < n; i++) {
        db.events.push({ resourceId: id, type, at: new Date(now - ((i * 7919) % 45) * day).toISOString() })
      }
    }
    push('impression', imp)
    push('view', views)
    push('referral', refs)
  }
  const searchSeed: [SearchLog['categories'], string, number, string[]][] = [
    [['food'], '91204', 3, []],
    [['food'], '91205', 3, ['income']],
    [['utilities'], '91203', 1, ['income', 'res']],
    [['utilities'], '91201', 1, ['income']],
    [['arts_music', 'youth_childcare'], '91205', 2, ['res']],
    [['jobs'], '91204', 1, []],
    [['housing'], '91206', 0, []],
    [['housing'], '91201', 0, []],
    [['health'], '91214', 0, []],
    [['youth_childcare'], '91204', 2, ['income']],
    [['transportation', 'seniors'], '91202', 1, ['other']],
    [['legal', 'housing'], '90041', 1, ['res']],
    [['food'], '91214', 1, ['income']],
    [['housing'], '91204', 0, []],
  ]
  searchSeed.forEach(([categories, zip, resultCount, unconfirmedRules], i) =>
    db.searches.push({ categories, zip, resultCount, unconfirmedRules, at: new Date(now - i * day * 2).toISOString() }),
  )
  return db
}

export const db: DB = globalForStore.__consiDB ?? (globalForStore.__consiDB = seed())

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function guest(id: string): GuestData {
  let g = db.guests.get(id)
  if (!g) {
    g = { saved: [], reminders: [], prefs: null }
    db.guests.set(id, g)
  }
  return g
}

export function publishedResources() {
  return [...db.resources.values()].filter((r) => r.status === 'published')
}

export function track(resourceId: string, type: TrackEventType) {
  if (!db.resources.has(resourceId)) return
  db.events.push({ resourceId, type, at: new Date().toISOString() })
}

export function logReview(resourceId: string, actor: ReviewEvent['actor'], action: string, note?: string) {
  db.reviews.unshift({ id: newId('rev'), resourceId, actor, action, note, at: new Date().toISOString() })
}
