import 'server-only'
import { SAMPLE_ACTIVITY, SAMPLE_PROVIDERS, SAMPLE_RESOURCES, SAMPLE_SEARCHES } from '../../demo-data'
import type {
  Preferences,
  Provider,
  Reminder,
  Resource,
  ResourceChange,
  ReviewEvent,
  SearchHistoryEntry,
  SearchLog,
  TrackEvent,
  TrackEventType,
} from '../../types'
import { newId } from './ids'
import type { DataProvider, ResourceFilter, ResourceStats } from './types'

/**
 * In-memory demo provider. Holds fictional sample records and anything a
 * visitor does during this server session. Nothing is written to disk, and
 * everything resets when the server restarts.
 */

interface GuestState {
  saved: string[]
  reminders: Reminder[]
  prefs: Preferences | null
  history: SearchHistoryEntry[]
  activeHistoryId: string | null
  aiUpdates: boolean
}

interface DemoState {
  resources: Map<string, Resource>
  providers: Map<string, Provider>
  reviews: ReviewEvent[]
  events: TrackEvent[]
  searches: SearchLog[]
  guests: Map<string, GuestState>
  changes: ResourceChange[]
  snapshots: Map<string, Resource>
}

const HISTORY_LIMIT = 50
const CHANGE_LIMIT = 500
const DAY = 86400000

const copy = <T>(value: T): T => structuredClone(value)

const publishedSnapshots = (resources: Iterable<Resource>) =>
  new Map([...resources].filter((r) => r.status === 'published').map((r) => [r.id, copy(r)]))

function seed(): DemoState {
  const now = Date.now()
  const events: TrackEvent[] = []
  for (const [resourceId, impressions, views, referrals] of SAMPLE_ACTIVITY) {
    const push = (type: TrackEventType, n: number) => {
      for (let i = 0; i < n; i++) events.push({ resourceId, type, at: new Date(now - ((i * 7919) % 45) * DAY).toISOString() })
    }
    push('impression', impressions)
    push('view', views)
    push('referral', referrals)
  }
  return {
    resources: new Map(SAMPLE_RESOURCES.map((r) => [r.id, copy(r)])),
    providers: new Map(SAMPLE_PROVIDERS.map((p) => [p.id, copy(p)])),
    reviews: [],
    events,
    searches: SAMPLE_SEARCHES.map(([categories, zip, resultCount, unconfirmedRules], i) => ({
      categories,
      zip,
      resultCount,
      unconfirmedRules,
      at: new Date(now - i * DAY * 2).toISOString(),
    })),
    guests: new Map(),
    changes: [],
    snapshots: publishedSnapshots(SAMPLE_RESOURCES),
  }
}

// Kept on globalThis so dev hot reloads do not wipe the session's demo data.
const globalForDemo = globalThis as unknown as { __consiDemo?: DemoState }
const state: DemoState = globalForDemo.__consiDemo ?? (globalForDemo.__consiDemo = seed())

function guest(id: string): GuestState {
  let g = state.guests.get(id)
  if (!g) {
    g = { saved: [], reminders: [], prefs: null, history: [], activeHistoryId: null, aiUpdates: false }
    state.guests.set(id, g)
  }
  return g
}

const matches = (r: Resource, f: ResourceFilter = {}) => {
  if (f.providerId && r.providerId !== f.providerId) return false
  if (f.status) return Array.isArray(f.status) ? f.status.includes(r.status) : r.status === f.status
  return true
}

export const demoProvider: DataProvider = {
  label: 'Demo data (in-memory, resets on restart)',
  isDemo: true,

  resources: {
    async get(id) {
      const r = state.resources.get(id)
      return r ? copy(r) : null
    },
    async getMany(ids) {
      return ids.flatMap((id) => {
        const r = state.resources.get(id)
        return r ? [copy(r)] : []
      })
    },
    async list(filter) {
      return [...state.resources.values()].filter((r) => matches(r, filter)).map(copy)
    },
    async exists(id) {
      return state.resources.has(id)
    },
    async save(resource) {
      state.resources.set(resource.id, copy(resource))
      return copy(resource)
    },
    async setStatusForProvider(providerId, from, to) {
      let n = 0
      for (const r of state.resources.values()) {
        if (r.providerId === providerId && r.status === from) {
          r.status = to
          n++
        }
      }
      return n
    },
  },

  providers: {
    async get(id) {
      const p = state.providers.get(id)
      return p ? copy(p) : null
    },
    async list() {
      return [...state.providers.values()].map(copy)
    },
    async save(provider) {
      state.providers.set(provider.id, copy(provider))
      return copy(provider)
    },
  },

  guests: {
    async listSaved(guestId) {
      return [...guest(guestId).saved]
    },
    async addSaved(guestId, resourceId) {
      const g = guest(guestId)
      if (!g.saved.includes(resourceId)) g.saved.unshift(resourceId)
      return [...g.saved]
    },
    async removeSaved(guestId, resourceId) {
      const g = guest(guestId)
      g.saved = g.saved.filter((s) => s !== resourceId)
      return [...g.saved]
    },
    async listReminders(guestId) {
      return guest(guestId).reminders.map(copy)
    },
    async getReminder(guestId, id) {
      const r = guest(guestId).reminders.find((x) => x.id === id)
      return r ? copy(r) : null
    },
    async addReminder(guestId, reminder) {
      guest(guestId).reminders.push(copy(reminder))
      return copy(reminder)
    },
    async removeReminder(guestId, id) {
      const g = guest(guestId)
      g.reminders = g.reminders.filter((r) => r.id !== id)
    },
    async getPrefs(guestId) {
      const p = guest(guestId).prefs
      return p ? copy(p) : null
    },
    async setPrefs(guestId, prefs) {
      guest(guestId).prefs = copy(prefs)
      return copy(prefs)
    },
    async getAiUpdates(guestId) {
      return guest(guestId).aiUpdates
    },
    async setAiUpdates(guestId, enabled) {
      guest(guestId).aiUpdates = enabled
      return enabled
    },
    async deleteAll(guestId) {
      state.guests.delete(guestId)
    },
  },

  history: {
    async list(guestId) {
      return guest(guestId).history.map(copy)
    },
    async get(guestId, id) {
      const h = guest(guestId).history.find((x) => x.id === id)
      return h ? copy(h) : null
    },
    async record(guestId, id, criteria, page, response) {
      const g = guest(guestId)
      const now = new Date().toISOString()
      const existing = g.history.find((h) => h.id === id)
      if (existing) {
        Object.assign(existing, copy({ criteria, page, total: response.total, response }), { updatedAt: now })
      } else {
        g.history.unshift(copy({ id, createdAt: now, updatedAt: now, criteria, page, total: response.total, response }))
        if (g.history.length > HISTORY_LIMIT) g.history.length = HISTORY_LIMIT
      }
      g.activeHistoryId = id
    },
    async getActive(guestId) {
      const g = guest(guestId)
      const h = g.activeHistoryId ? g.history.find((x) => x.id === g.activeHistoryId) : undefined
      return h ? copy(h) : null
    },
    async clearActive(guestId) {
      guest(guestId).activeHistoryId = null
    },
  },

  activity: {
    async track(resourceId, type) {
      if (!state.resources.has(resourceId)) return
      state.events.push({ resourceId, type, at: new Date().toISOString() })
    },
    async statsFor(resourceIds) {
      const out: Record<string, ResourceStats> = Object.fromEntries(resourceIds.map((id) => [id, { impressions: 0, views: 0, referrals: 0 }]))
      const key = { impression: 'impressions', view: 'views', referral: 'referrals' } as const
      for (const e of state.events) if (out[e.resourceId]) out[e.resourceId][key[e.type]]++
      return out
    },
    async logSearch(log) {
      state.searches.push(copy(log))
    },
    async listSearches() {
      return state.searches.map(copy)
    },
  },

  reviews: {
    async log(resourceId, actor, action, note) {
      state.reviews.unshift({ id: newId('rev'), resourceId, actor, action, note, at: new Date().toISOString() })
    },
    async listForResource(resourceId) {
      return state.reviews.filter((v) => v.resourceId === resourceId).map(copy)
    },
    async listRecent(limit) {
      return state.reviews.slice(0, limit).map(copy)
    },
  },

  changes: {
    async add(change) {
      state.changes.unshift({ ...copy(change), id: newId('chg'), at: new Date().toISOString() })
      if (state.changes.length > CHANGE_LIMIT) state.changes.length = CHANGE_LIMIT
    },
    async listSince(iso) {
      return state.changes.filter((c) => c.at >= iso).map(copy)
    },
    async getSnapshot(resourceId) {
      const s = state.snapshots.get(resourceId)
      return s ? copy(s) : null
    },
    async setSnapshot(resource) {
      state.snapshots.set(resource.id, copy(resource))
    },
  },
}
