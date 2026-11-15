import 'server-only'
// Adapter between this frontend and the live Glendale Concierge engine
// (https://github.com/endlessriver-og/glendale-concierge-api). The UI keeps calling this app's own
// /api/* routes in its own shapes; this file fetches from the engine and maps the answers.
// If the engine is unreachable every caller falls back to the built-in sample engine.
import { translate } from '../i18n'
import type { Category, CostType, DisplayStatus, EligibilityCheck, FollowUpQuestion, Lang, Recommendation, Resource, SearchRequest, SearchResponse } from '../types'
import { resolveLocation } from './gis'
import { data } from './data'

export const LIVE_API = (process.env.CONCIERGE_API_URL ?? 'https://glendale-concierge-api.vercel.app').replace(/\/$/, '')
export const liveEnabled = () => process.env.CONCIERGE_API_URL !== 'off'

/** Shape returned by the engine (see its contract/schemas.ts). Only the fields used here. */
export interface LiveResource {
  id: string
  name: string
  provider: string | null
  category: string
  subcategories: string[]
  description: string
  audience: string | null
  languagesOffered: string[]
  cost: { status: 'free' | 'low' | 'paid' | 'unknown'; note: string | null }
  eligibility: { summary: string | null; requirements: string[]; unconfirmed: string[] }
  location: { address: string | null; city: string | null; lat: number | null; lon: number | null }
  contact: { phone: string | null; url: string | null; email: string | null }
  actionUrl: string | null
  hours: string | null
  confidence: { status: 'verified' | 'potential' | 'outdated' | 'unknown'; label: string; lastVerifiedAt: string | null; lastCheckedAt?: string | null; sourceName: string | null; note: string }
  nextStep: string
  transit?: { label: string } | null
  distanceKm?: number
  why?: string
  translated: boolean
  originalLang: string
  sourceLabel?: 'public_listing' | 'provider' | 'demo'
  sourceLabelText?: string
  fit?: { audience?: 'met' | 'confirm' | 'not_met'; cost?: 'met' | 'confirm' | 'not_met' }
}

const CATEGORY: Record<string, Category[]> = {
  childcare: ['youth_childcare'],
  youth: ['youth_childcare'],
  food: ['food'],
  seniors: ['seniors'],
  'library-digital': ['education'],
  jobs: ['jobs'],
  health: ['health'],
  housing: ['housing'],
  'immigrant-language': ['education', 'legal'],
}
const COST: Record<string, CostType> = { free: 'free', low: 'subsidized', paid: 'paid', unknown: 'unknown' }
const STATUS: Record<string, DisplayStatus> = { verified: 'verified', potential: 'potential_match', outdated: 'needs_review', unknown: 'needs_review' }
const LANGS: Lang[] = ['en', 'es', 'hy', 'zh']

async function api<T>(path: string, init?: RequestInit, timeoutMs = 9000): Promise<T> {
  const res = await fetch(LIVE_API + path, { ...init, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs), headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`engine ${path} ${res.status}`)
  return (await res.json()) as T
}

/** Engine record -> this app's Resource. Unknown facts stay unknown (null / 'unknown'), never guessed. */
export function toResource(r: LiveResource): Resource {
  const zip = r.location.address?.match(/\b9\d{4}\b/)?.[0] ?? ''
  const now = new Date().toISOString()
  const langs = r.languagesOffered.filter((l): l is Lang => (LANGS as string[]).includes(l))
  return {
    id: r.id,
    providerId: null,
    organization: r.provider ?? '',
    name: r.name,
    summary: r.description,
    sourceLanguage: r.originalLang,
    categories: CATEGORY[r.category] ?? [],
    tags: r.subcategories,
    cost: COST[r.cost.status] ?? 'unknown',
    costDetail: r.cost.note ?? undefined,
    ageGroups: [],
    eligibility: [],
    location: { address: r.location.address ?? '', city: r.location.city ?? '', zip, lat: r.location.lat ?? 34.1425, lng: r.location.lon ?? -118.255 },
    phone: r.contact.phone ?? undefined,
    email: r.contact.email ?? undefined,
    website: r.actionUrl ?? r.contact.url ?? undefined,
    languages: langs.length ? langs : ['en'],
    accessibility: [],
    transitNearby: Boolean(r.transit),
    registrationRequired: null,
    availability: 'open',
    schedule: r.hours ?? undefined,
    translations: {},
    status: 'published',
    verification: r.confidence.status === 'verified' ? 'verified' : r.confidence.status === 'potential' ? 'unverified' : 'needs_review',
    lastVerified: r.confidence.lastVerifiedAt ?? r.confidence.lastCheckedAt ?? undefined,
    source: [r.confidence.sourceName, r.sourceLabelText].filter(Boolean).join(' · ') || 'Glendale Concierge',
    isSample: r.sourceLabel === 'demo',
    reviewNotes: r.confidence.note,
    createdAt: now,
    updatedAt: now,
  }
}

function toRecommendation(r: LiveResource, i: number, lang: Lang = 'en', ageGroup?: 'child' | 'teen' | 'adult' | 'senior'): Recommendation {
  const resource = toResource(r)
  // Keep saved items, reminders and tracking working for live records.
  void data.resources.save(resource).catch(() => {})
  const why = [r.why, r.transit?.label, r.confidence.note, r.nextStep].filter((x): x is string => Boolean(x))
  return {
    resource,
    display: { name: r.name, summary: r.description, translated: r.translated },
    distanceMiles: r.distanceKm == null ? null : Math.round(r.distanceKm * 0.621371 * 10) / 10,
    displayStatus: STATUS[r.confidence.status] ?? 'needs_review',
    why: [...new Set(why)],
    eligibility: [
      // How this listing fits what the resident told us in the follow-up questions.
      ...(r.fit?.audience && ageGroup ? [{ label: r.audience ? `${translate(lang, `age.${ageGroup}`)}: ${r.audience}` : translate(lang, `age.${ageGroup}`), state: r.fit.audience } satisfies EligibilityCheck] : []),
      ...(r.fit?.cost ? [{ label: translate(lang, `cost.${COST[r.cost.status] ?? 'unknown'}` as Parameters<typeof translate>[1]), state: r.fit.cost } satisfies EligibilityCheck] : []),
      ...(r.eligibility.summary ? [{ label: r.eligibility.summary, state: 'confirm' as const }] : []),
      ...r.eligibility.unconfirmed.slice(0, 3).map((label) => ({ label, state: 'confirm' as const })),
    ],
    score: 100 - i,
  }
}

interface LiveSearch {
  searchId: string
  interpreted: { summary: string; category: string | null; ageGroup?: 'child' | 'teen' | 'adult' | 'senior' | null }
  results: LiveResource[]
  hasMore: boolean
  mode: 'ai' | 'keyword' | 'fixture'
}

/** Remember the engine's searchId per result so a later referral click can be tied to its search. */
const searchOf = new Map<string, string>()

export async function liveSearch(req: SearchRequest): Promise<SearchResponse> {
  const geo = await resolveLocation(req.location)
  const filters: Record<string, unknown> = {}
  if (req.filters.cost === 'free') filters.cost = 'free'
  if (req.filters.cost === 'subsidized') filters.cost = 'low'
  // Answers to the follow-up questions become the resident's profile for ranking.
  const a = req.answers
  const profile = {
    ...(a.ageGroup && a.ageGroup !== 'skip' ? { ageGroup: a.ageGroup } : {}),
    ...(a.incomeQualifies === 'yes' ? { lowIncome: true } : a.incomeQualifies === 'no' ? { lowIncome: false } : {}),
    ...(a.residentOf && a.residentOf !== 'skip' ? { resident: a.residentOf } : {}),
  }
  const body = {
    query: req.query.trim() || 'community resources',
    lang: req.lang,
    location: { lat: geo.lat, lon: geo.lng },
    ...(Object.keys(filters).length ? { filters } : {}),
    ...(Object.keys(profile).length ? { profile } : {}),
  }
  const out = await api<LiveSearch>('/api/search', { method: 'POST', body: JSON.stringify(body) })
  if (out.mode === 'fixture') throw new Error('engine returned sample data')
  const ageGroup = profile.ageGroup ?? out.interpreted.ageGroup ?? undefined
  let results = out.results.map((r, i) => toRecommendation(r, i, req.lang, ageGroup))
  if (req.filters.transit) results = results.filter((r) => r.resource.transitNearby)
  if (req.filters.language && req.filters.language !== 'any') results = results.filter((r) => r.resource.languages.includes(req.filters.language as Lang))
  for (const r of results) searchOf.set(r.resource.id, out.searchId)
  return {
    interpretation: { summary: out.interpreted.summary, categories: out.interpreted.category ? (CATEGORY[out.interpreted.category] ?? []) : [], usedAI: out.mode === 'ai' },
    followUp: nextLiveQuestion(req, results.length, Boolean(out.interpreted.ageGroup)),
    results,
    total: results.length,
    page: 1,
    pageCount: 1,
    radiusMiles: req.radiusMiles,
    radiusExpanded: false,
    origin: { lat: geo.lat, lng: geo.lng, label: geo.label },
  }
}

/**
 * One qualification question at a time, shown above the results (at most two per search).
 * Results are already on screen; each answer re-ranks them and updates the fit check on every card.
 */
function nextLiveQuestion(req: SearchRequest, resultCount: number, ageKnownFromQuery: boolean): FollowUpQuestion | null {
  if (!resultCount) return null
  const a = req.answers
  if (Object.values(a).filter(Boolean).length >= 2) return null
  const t = (k: Parameters<typeof translate>[1]) => translate(req.lang, k)
  if (!a.ageGroup && !ageKnownFromQuery) {
    return { key: 'ageGroup', question: t('fu.ageQ'), why: t('fu.ageWhy'), options: (['child', 'teen', 'adult', 'senior'] as const).map((v) => ({ value: v, label: t(`age.${v}`) })) }
  }
  if (!a.incomeQualifies) {
    return {
      key: 'incomeQualifies',
      question: t('fu.incomeQ'),
      why: t('fu.incomeWhy'),
      options: [
        { value: 'yes', label: t('fu.yes') },
        { value: 'no', label: t('fu.no') },
        { value: 'skip', label: t('fu.notSure') },
      ],
    }
  }
  if (!a.residentOf) {
    return {
      key: 'residentOf',
      question: t('fu.residencyQ'),
      why: t('fu.residencyWhy'),
      options: [
        { value: 'glendale', label: t('fu.glendale') },
        { value: 'la_county', label: t('fu.laCounty') },
        { value: 'other', label: t('fu.other') },
      ],
    }
  }
  return null
}

/** Count a referral in the engine (it feeds the city dashboard). Fire-and-forget. */
export async function liveReferral(resourceId: string) {
  if (!liveEnabled()) return
  const sid = searchOf.get(resourceId)
  try {
    await fetch(`${LIVE_API}/api/referral/${encodeURIComponent(resourceId)}${sid ? `?searchId=${sid}` : ''}`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000) })
  } catch {
    /* the click itself must never fail */
  }
}

/** Typed concierge turn: run the engine's search for the need, then its grounded concierge reply. */
export async function liveConcierge(lang: Lang, zip: string | undefined, messages: { role: 'user' | 'assistant'; content: string }[], lastQuery?: string) {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const geo = await resolveLocation(zip ? { zip } : null)
  const find = (query: string) => api<LiveSearch & { interpreted: { category: string | null } }>('/api/search', { method: 'POST', body: JSON.stringify({ query, lang, location: { lat: geo.lat, lon: geo.lng } }) })
  let s = await find(last)
  let shown = last
  // A follow-up such as "which is closest?" names no need of its own: answer it about the resident's last search.
  if (lastQuery?.trim() && lastQuery.trim() !== last.trim() && (!s.interpreted.category || s.results.length === 0)) {
    s = await find(lastQuery)
    shown = lastQuery
  }
  const usable = s.mode !== 'fixture' ? s.results : []
  usable.forEach((r, i) => toRecommendation(r, i))
  const c = await api<{ reply: string }>('/api/concierge', {
    method: 'POST',
    body: JSON.stringify({ message: last, lang, context: { searchId: s.searchId, visibleResourceIds: usable.map((r) => r.id) } }),
  }, 12000)
  return { reply: c.reply, search: usable.length ? { query: shown, results: usable.map((r) => ({ id: r.id, name: r.name })) } : null, guide: null }
}

/** Publish an approved listing into the engine so residents can find it in any language. Needs CONCIERGE_ADMIN_TOKEN. */
export async function livePublish(r: Resource): Promise<string | null> {
  const token = process.env.CONCIERGE_ADMIN_TOKEN
  if (!liveEnabled() || !token) return null
  const category =
    ({ youth_childcare: 'childcare', food: 'food', seniors: 'seniors', education: 'library-digital', jobs: 'jobs', health: 'health', housing: 'housing', utilities: 'housing', legal: 'immigrant-language', arts_music: 'youth', transportation: 'seniors' } as Record<string, string>)[r.categories[0]] ?? 'seniors'
  const body = {
    name: r.name,
    provider: r.organization,
    category,
    subcategories: r.tags,
    description: r.summary,
    languagesOffered: r.languages,
    costStatus: r.cost === 'subsidized' ? 'low' : r.cost,
    costNote: r.costDetail ?? null,
    address: [r.location.address, r.location.city, 'CA', r.location.zip].filter(Boolean).join(', '),
    city: r.location.city,
    phone: r.phone ?? null,
    email: r.email || null,
    url: r.website || null,
    actionUrl: r.website || null,
    hours: r.schedule ?? null,
    sourceName: `${r.organization} (provider submission)`,
    confidenceStatus: 'potential',
    confidenceNote: 'Posted by the provider. Details have not been independently confirmed yet.',
  }
  try {
    const out = await api<{ id: string }>('/api/admin/resources', { method: 'POST', body: JSON.stringify(body), headers: { 'x-admin-token': token } }, 12000)
    return out.id
  } catch (e) {
    console.error('[live] publish failed', e)
    return null
  }
}

/** Flyer text -> draft fields, using the engine's extractor (Claude Haiku). Returns null if unavailable. */
export async function liveExtract(text: string, file?: { mediaType: string; data: string }) {
  const token = process.env.CONCIERGE_ADMIN_TOKEN
  if (!liveEnabled() || !token || (!file && text.trim().length < 20)) return null
  try {
    const out = await api<{ draft: Record<string, unknown>; missing: string[] }>(
      '/api/admin/ingest',
      { method: 'POST', body: JSON.stringify(file ? { text, file } : { text }), headers: { 'x-admin-token': token } },
      file ? 28000 : 20000,
    )
    const d = out.draft as Record<string, string | string[] | null | undefined>
    const str = (k: string) => (typeof d[k] === 'string' && d[k] && !/^(unknown|n\/?a|none|null)$/i.test((d[k] as string).trim()) ? (d[k] as string).trim() : null)
    const address = str('address')
    const cost = str('costStatus')
    const FIELD: Record<string, string> = { description: 'summary', costStatus: 'cost', hours: 'schedule', eligibilitySummary: 'eligibilityText', actionUrl: 'website', audience: 'ageGroups' }
    return {
      organization: str('provider'),
      name: str('name'),
      summary: str('description'),
      categories: CATEGORY[str('category') ?? ''] ?? [],
      cost: cost === 'free' ? ('free' as const) : cost === 'low' ? ('subsidized' as const) : cost === 'paid' ? ('paid' as const) : null,
      costDetail: str('costNote'),
      // Read only from the flyer's own stated audience; still listed under uncertainFields for the provider to confirm.
      ageGroups: ([
        [/senior|older adult|elder|55\+|60\+|65\+/i, 'senior'],
        [/teen|youth|high school/i, 'teen'],
        [/child|kid|toddler|preschool|infant|grade|student/i, 'child'],
        [/adult/i, 'adult'],
      ] as [RegExp, 'child' | 'teen' | 'adult' | 'senior'][]).filter(([re]) => re.test(str('audience') ?? '')).map(([, g]) => g).slice(0, 2),
      eligibilityText: str('eligibilitySummary'),
      address: address ? address.split(',')[0].trim() : null,
      city: (str('city') ?? '').split(',')[0].trim() || null,
      zip: `${address ?? ''} ${str('city') ?? ''} ${text}`.match(/\b9\d{4}\b/)?.[0] ?? null,
      phone: str('phone'),
      email: str('email'),
      website: str('actionUrl') ?? str('url'),
      languages: (Array.isArray(d.languagesOffered) ? d.languagesOffered : []).filter((l): l is Lang => (LANGS as string[]).includes(l)),
      schedule: str('hours'),
      deadline: null,
      startDate: null,
      registrationRequired: null,
      sourceLanguage: 'en' as const,
      rawText: text,
      uncertainFields: [...new Set(out.missing.filter((m) => m !== 'lat' && m !== 'lon').map((m) => FIELD[m] ?? m).concat(['ageGroups']))],
    }
  } catch (e) {
    console.error('[live] extract failed', e)
    return null
  }
}

/** Engine-side counts for listings this app published there: { liveId: { shown, referrals } }. */
export async function liveStats(): Promise<Record<string, { shown: number; referrals: number }>> {
  const token = process.env.CONCIERGE_ADMIN_TOKEN
  if (!liveEnabled() || !token) return {}
  try {
    const out = await api<{ resources: { id: string; shown: number; referrals: number }[] }>('/api/admin/resources', { headers: { 'x-admin-token': token } })
    return Object.fromEntries(out.resources.map((r) => [r.id, { shown: r.shown ?? 0, referrals: r.referrals ?? 0 }]))
  } catch {
    return {}
  }
}

/**
 * Listings this organization published into the engine, with their real counts. The engine is durable, so this
 * keeps the provider dashboard correct even when this app's in-memory store has been reset by a new server instance.
 */
export async function liveProviderListings(org: string, providerId: string) {
  const token = process.env.CONCIERGE_ADMIN_TOKEN
  if (!liveEnabled() || !token) return []
  try {
    const list = await api<{ resources: { id: string; provider: string | null; addedByAdmin: boolean; status: string; shown: number; referrals: number }[] }>('/api/admin/resources', { headers: { 'x-admin-token': token } })
    const mine = list.resources.filter((r) => r.addedByAdmin && r.status === 'published' && (r.provider ?? '').trim().toLowerCase() === org.trim().toLowerCase())
    if (!mine.length) return []
    const full = await api<{ resources: LiveResource[] }>(`/api/resources?ids=${mine.map((m) => encodeURIComponent(m.id)).join(',')}`)
    return full.resources.map((r) => {
      const m = mine.find((x) => x.id === r.id)!
      return { ...toResource(r), providerId, source: 'Provider submission (live)', stats: { impressions: m.shown ?? 0, views: 0, referrals: m.referrals ?? 0 }, reviews: [] }
    })
  } catch (e) {
    console.error('[live] provider listings failed', e)
    return []
  }
}
