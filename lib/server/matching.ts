import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { translate } from '../i18n'
import { CATEGORIES } from '../types'
import type {
  AgeGroup,
  Category,
  DisplayStatus,
  EligibilityCheck,
  FollowUpQuestion,
  Lang,
  Recommendation,
  Resource,
  SearchRequest,
  SearchResponse,
} from '../types'
import { distanceMiles, resolveLocation, type GeoPoint } from './gis'
import { data } from './data'
import { liveEnabled, liveSearch } from './live'

export const AI_MODEL = 'google/gemini-3.5-flash'
const PAGE_SIZE = 3
const STALE_DAYS = 180

/* ---------- 1. Understand the request ---------- */

interface Interpretation {
  categories: Category[]
  keywords: string[]
  ageGroup: AgeGroup | null
  wantsFree: boolean
  summary: string
  usedAI: boolean
}

const KEYWORDS: Record<Category, string[]> = {
  arts_music: ['music', 'guitar', 'piano', 'violin', 'sing', 'art', 'paint', 'música', 'arte', 'guitarra', 'երաժշտ', 'արվեստ', '音乐', '艺术', '钢琴', '吉他'],
  food: ['food', 'grocer', 'pantry', 'meal', 'hungry', 'eat', 'comida', 'alimento', 'despensa', 'սնունդ', 'մթերք', '食物', '食品', '吃'],
  utilities: ['utility', 'utilities', 'bill', 'electric', 'gas', 'power', 'water', 'luz', 'factura', 'servicios', 'կոմունալ', 'էլեկտր', '电费', '水电', '账单', '燃气'],
  jobs: ['job', 'work', 'career', 'resume', 'employ', 'training', 'trabajo', 'empleo', 'capacitación', 'աշխատ', 'ուսուցում', '工作', '就业', '培训'],
  housing: ['housing', 'rent', 'apartment', 'evict', 'shelter', 'home', 'vivienda', 'renta', 'alquiler', 'բնակարան', 'վարձ', '住房', '租', '房'],
  health: ['health', 'doctor', 'clinic', 'medical', 'dental', 'mental', 'salud', 'médico', 'առողջ', 'բժիշկ', '健康', '医生', '医疗'],
  youth_childcare: ['child', 'kid', 'son', 'daughter', 'teen', 'youth', 'after school', 'childcare', 'niño', 'hijo', 'hija', 'երեխա', 'որդի', 'աղջիկ', '孩子', '儿童', '青少年', '托管'],
  education: ['class', 'learn', 'computer', 'school', 'course', 'english', 'clase', 'curso', 'computadora', 'դաս', 'համակարգիչ', '课', '学习', '电脑'],
  legal: ['legal', 'lawyer', 'tenant', 'evict', 'immigration', 'abogado', 'legal', 'inquilino', 'իրավաբան', 'փաստաբան', '法律', '律师', '租客'],
  transportation: ['ride', 'transport', 'bus', 'drive', 'appointment', 'transporte', 'viaje', 'տրանսպորտ', 'ուղևոր', '交通', '接送', '车'],
  seniors: ['senior', 'elder', 'older', 'grandparent', 'retire', 'mayor', 'anciano', 'տարեց', 'ծեր', '长者', '老人', '退休'],
}

function keywordInterpret(query: string): Interpretation {
  const q = query.toLowerCase()
  const categories = CATEGORIES.filter((c) => KEYWORDS[c].some((k) => q.includes(k)))
  const ageMatch = q.match(/(\d{1,2})[\s-]*(year|yr|años|տարեկան|岁)/)
  let ageGroup: AgeGroup | null = null
  if (ageMatch) {
    const n = Number(ageMatch[1])
    ageGroup = n < 13 ? 'child' : n < 18 ? 'teen' : n < 60 ? 'adult' : 'senior'
  } else if (/(son|daughter|kid|child|niño|hijo|hija|երեխա|孩子|儿童)/.test(q)) ageGroup = 'child'
  else if (/(teen|adolescente|դեռահաս|青少年)/.test(q)) ageGroup = 'teen'
  else if (/(senior|older|elder|mayor|տարեց|长者|老人)/.test(q)) ageGroup = 'senior'
  return {
    categories,
    keywords: q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2),
    ageGroup,
    wantsFree: /(free|gratis|gratuit|անվճար|免费)/.test(q),
    summary: query,
    usedAI: false,
  }
}

const interpretCache = new Map<string, Interpretation>()

const interpretationSchema = z.object({
  categories: z.array(z.enum(CATEGORIES)).describe('Most relevant first. Empty if unclear.'),
  keywords: z.array(z.string()).describe('Short lowercase English keywords describing the need, such as "guitar", "rent".'),
  ageGroup: z.enum(['child', 'teen', 'adult', 'senior']).nullable().describe('Who the support is for, only if stated or clearly implied.'),
  wantsFree: z.boolean(),
  summary: z.string().describe('One short, warm sentence restating the need, written in the requested language.'),
})

export async function interpret(query: string, lang: Lang): Promise<Interpretation> {
  const key = `${lang}:${query.trim().toLowerCase()}`
  const cached = interpretCache.get(key)
  if (cached) return cached
  let result: Interpretation
  try {
    const { output } = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: interpretationSchema }),
      system:
        'You classify community resource requests from residents of Glendale and Los Angeles County. ' +
        'Requests may be in English, Spanish, Armenian, or Mandarin Chinese, and may be vague. ' +
        'Never invent programs. Only classify the need.',
      prompt: `Request: """${query.slice(0, 500)}"""\nWrite the summary in ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'hy' ? 'Armenian' : 'Simplified Chinese'}.`,
      abortSignal: AbortSignal.timeout(8000),
    })
    result = { ...output, keywords: output.keywords.map((k) => k.toLowerCase()), usedAI: true }
    // Merge in deterministic keyword hits so obvious matches are never lost.
    const fallback = keywordInterpret(query)
    result.categories = [...new Set([...result.categories, ...fallback.categories])]
    result.ageGroup ??= fallback.ageGroup
  } catch (error) {
    console.error('[matching] AI interpretation failed, using keyword fallback', error)
    result = keywordInterpret(query)
  }
  interpretCache.set(key, result)
  return result
}

/* ---------- 2. Assess eligibility (never guarantee it) ---------- */

const AGE_RANGES: Record<AgeGroup, [number, number]> = { child: [0, 12], teen: [13, 17], adult: [18, 59], senior: [60, 120] }

function assessEligibility(r: Resource, ageGroup: AgeGroup | null, req: SearchRequest, geo: GeoPoint, geoFromUser: boolean): EligibilityCheck[] {
  const residentOf = req.answers.residentOf && req.answers.residentOf !== 'skip' ? req.answers.residentOf : geoFromUser ? (geo.area === 'other' ? 'other' : geo.area) : null
  const income = req.answers.incomeQualifies
  return r.eligibility.map((rule) => {
    let state: EligibilityCheck['state'] = 'confirm'
    if (rule.kind === 'age' && ageGroup) {
      const [lo, hi] = AGE_RANGES[ageGroup]
      const min = rule.min ?? 0
      const max = rule.max ?? 120
      if (lo >= min && hi <= max) state = 'met'
      else if (hi < min || lo > max) state = 'not_met'
    } else if (rule.kind === 'residency' && residentOf) {
      if (rule.area === 'glendale') state = residentOf === 'glendale' ? 'met' : residentOf === 'other' ? 'not_met' : 'confirm'
      else state = residentOf === 'other' ? 'not_met' : 'met'
    } else if (rule.kind === 'income' && income && income !== 'skip') {
      state = income === 'yes' ? 'met' : 'not_met'
    }
    return { label: rule.label, state }
  })
}

function displayStatusFor(r: Resource, checks: EligibilityCheck[]): DisplayStatus {
  const stale = !r.lastVerified || Date.now() - new Date(r.lastVerified).getTime() > STALE_DAYS * 86400000
  if (r.verification === 'needs_review' || stale) return 'needs_review'
  if (r.verification === 'verified' && checks.every((c) => c.state === 'met')) return 'verified'
  return 'potential_match'
}

/* ---------- 3. Explain the recommendation ---------- */

const WHY: Record<Lang, { cat: string; free: string; low: string; near: string; lang: string; age: string; transit: string; open: string }> = {
  en: { cat: 'Offers {x}', free: 'Free to join', low: 'Low cost: {x}', near: 'About {x} miles from {p}', lang: 'Staff speak {x}', age: 'Designed for {x}', transit: 'Near public transit', open: 'Sign-up is open now' },
  es: { cat: 'Ofrece {x}', free: 'Es gratis', low: 'Bajo costo: {x}', near: 'A unas {x} millas de {p}', lang: 'El personal habla {x}', age: 'Pensado para {x}', transit: 'Cerca del transporte público', open: 'La inscripción está abierta' },
  hy: { cat: 'Առաջարկում է՝ {x}', free: 'Անվճար է', low: 'Մատչելի՝ {x}', near: 'Մոտ {x} մղոն {p}-ից', lang: 'Աշխատակազմը խոսում է {x}', age: 'Նախատեսված է՝ {x}', transit: 'Հասարակական տրանսպորտի մոտ', open: 'Գրանցումն այժմ բաց է' },
  zh: { cat: '提供{x}', free: '免费参加', low: '低价：{x}', near: '距离{p}约 {x} 英里', lang: '工作人员会说{x}', age: '适合{x}', transit: '靠近公共交通', open: '现在可以报名' },
}

const LANG_NAMES: Record<Lang, Record<Lang, string>> = {
  en: { en: 'English', es: 'Spanish', hy: 'Armenian', zh: 'Mandarin' },
  es: { en: 'inglés', es: 'español', hy: 'armenio', zh: 'mandarín' },
  hy: { en: 'անգլերեն', es: 'իսպաներեն', hy: 'հայերեն', zh: 'չինարեն' },
  zh: { en: '英语', es: '西班牙语', hy: '亚美尼亚语', zh: '普通话' },
}

const fill = (s: string, x: string | number, p = '') => s.replace('{x}', String(x)).replace('{p}', p)

function explain(r: Resource, lang: Lang, matched: Category[], ageGroup: AgeGroup | null, dist: number | null, geo: GeoPoint): string[] {
  const w = WHY[lang]
  const out: string[] = []
  if (matched[0]) out.push(fill(w.cat, translate(lang, `cat.${matched[0]}`).toLowerCase()))
  if (r.cost === 'free') out.push(w.free)
  else if (r.cost === 'subsidized' && r.costDetail) out.push(fill(w.low, r.costDetail))
  if (dist != null) out.push(fill(w.near, dist.toFixed(1), geo.label))
  if (ageGroup && r.ageGroups.includes(ageGroup)) out.push(fill(w.age, translate(lang, `age.${ageGroup}`).toLowerCase()))
  if (lang !== 'en' && r.languages.includes(lang)) out.push(fill(w.lang, LANG_NAMES[lang][lang]))
  if (r.availability === 'open' && r.registrationRequired) out.push(w.open)
  return out.slice(0, 4)
}

/* ---------- 4. Follow-up questions, one at a time ---------- */

function nextQuestion(candidates: Resource[], req: SearchRequest, ageGroup: AgeGroup | null, geoFromUser: boolean): FollowUpQuestion | null {
  const answered = Object.values(req.answers).filter(Boolean).length
  if (answered >= 2) return null
  const rules = new Set(candidates.flatMap((r) => r.eligibility.map((e) => e.kind)))
  const t = (k: Parameters<typeof translate>[1]) => translate(req.lang, k)
  if (rules.has('age') && !ageGroup && !req.answers.ageGroup) {
    return {
      key: 'ageGroup',
      question: t('fu.ageQ'),
      why: t('fu.ageWhy'),
      options: (['child', 'teen', 'adult', 'senior'] as const).map((v) => ({ value: v, label: t(`age.${v}`) })),
    }
  }
  if (rules.has('income') && !req.answers.incomeQualifies) {
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
  if (rules.has('residency') && !geoFromUser && !req.answers.residentOf) {
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

/* ---------- 5. Rank ---------- */

export function localize(r: Resource, lang: Lang) {
  if (lang === r.sourceLanguage) return { name: r.name, summary: r.summary, translated: false }
  const tr = r.translations[lang]
  if (tr) return { name: tr.name, summary: tr.summary, translated: true }
  return { name: r.name, summary: r.summary, translated: false }
}

/** Live engine first (real Glendale records, Claude ranking, trust statuses); built-in sample engine as the fallback. */
export async function search(req: SearchRequest): Promise<SearchResponse> {
  if (liveEnabled()) {
    try {
      return await liveSearch(req)
    } catch (e) {
      console.error('[search] live engine unavailable, using sample engine', e)
    }
  }
  return sampleSearch(req)
}

async function sampleSearch(req: SearchRequest): Promise<SearchResponse> {
  const query = req.query.trim()
  const intent = query ? await interpret(query, req.lang) : { ...keywordInterpret(''), summary: '' }
  const geoFromUser = Boolean(req.location && (req.location.zip || req.location.lat != null))
  const geo = await resolveLocation(req.location)
  const ageGroup = req.answers.ageGroup && req.answers.ageGroup !== 'skip' ? req.answers.ageGroup : intent.ageGroup
  const f = req.filters

  const scored = (await data.resources.list({ status: 'published' }))
    .filter((r) => {
      if (f.cost && f.cost !== 'any' && r.cost !== f.cost) return false
      if (f.ageGroup && f.ageGroup !== 'any' && !r.ageGroups.includes(f.ageGroup)) return false
      if (f.availability === 'open' && r.availability !== 'open') return false
      if (f.language && f.language !== 'any' && !r.languages.includes(f.language)) return false
      if (f.accessible && !r.accessibility.some((a) => /wheelchair/i.test(a))) return false
      if (f.transit && !r.transitNearby) return false
      if (f.noRegistration && r.registrationRequired) return false
      return true
    })
    .map((r) => {
      const matched = intent.categories.filter((c) => r.categories.includes(c))
      const tagHits = intent.keywords.filter((k) => r.tags.some((t) => t.includes(k) || k.includes(t))).length
      const relevant = matched.length > 0 || tagHits > 0 || intent.categories.length === 0
      const dist = distanceMiles(geo, r.location)
      const checks = assessEligibility(r, ageGroup, req, geo, geoFromUser)
      let score = 0
      if (matched.length) score += 40 + (intent.categories[0] && r.categories.includes(intent.categories[0]) ? 20 : 0)
      score += Math.min(tagHits, 4) * 8
      if (ageGroup) score += r.ageGroups.includes(ageGroup) ? 15 : -25
      if (intent.wantsFree && r.cost === 'free') score += 10
      score -= checks.filter((c) => c.state === 'not_met').length * 30
      score -= dist * 2
      if (r.verification === 'verified') score += 5
      if (r.availability === 'waitlist') score -= 4
      return { r, matched, relevant, dist, checks, score }
    })
    .filter((x) => x.relevant)
    .sort((a, b) => b.score - a.score)

  let radius = req.radiusMiles
  let inRange = scored.filter((x) => x.dist <= radius)
  let radiusExpanded = false
  while (inRange.length < PAGE_SIZE && radius < 25 && scored.length > inRange.length) {
    radius = Math.min(25, radius * 2)
    inRange = scored.filter((x) => x.dist <= radius)
    radiusExpanded = true
  }

  const pageCount = Math.max(1, Math.ceil(inRange.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, req.page), pageCount)
  const visible = inRange.slice(0, page * PAGE_SIZE)

  const results: Recommendation[] = visible.map((x) => ({
    resource: x.r,
    display: localize(x.r, req.lang),
    distanceMiles: Math.round(x.dist * 10) / 10,
    displayStatus: displayStatusFor(x.r, x.checks),
    why: explain(x.r, req.lang, x.matched, ageGroup, x.dist, geo),
    eligibility: x.checks,
    score: Math.round(x.score),
  }))

  if (page === 1 && query) {
    await data.activity.logSearch({
      categories: intent.categories,
      zip: geo.zip ?? null,
      resultCount: inRange.length,
      unconfirmedRules: results.slice(0, PAGE_SIZE).flatMap((r) => r.resource.eligibility.filter((_, i) => r.eligibility[i]?.state !== 'met').map((e) => e.kind)),
      at: new Date().toISOString(),
    })
  }

  return {
    interpretation: { summary: intent.summary || query, categories: intent.categories, usedAI: intent.usedAI },
    followUp: nextQuestion(inRange.slice(0, PAGE_SIZE * 2).map((x) => x.r), req, ageGroup, geoFromUser),
    results,
    total: inRange.length,
    page,
    pageCount,
    radiusMiles: radius,
    radiusExpanded: radiusExpanded && radius !== req.radiusMiles,
    origin: { lat: geo.lat, lng: geo.lng, label: geo.label },
  }
}
