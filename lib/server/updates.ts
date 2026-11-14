import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { LANGUAGE_META } from '../i18n'
import type { ChangedField, Lang, Resource, ResultUpdate, SearchHistoryEntry } from '../types'
import { AI_MODEL } from './matching'
import { db } from './store'

const DAY = 86400000
const CHANGE_WINDOW_DAYS = 60
const DEADLINE_WINDOW_DAYS = 30
const ENROLLMENT_WINDOW_DAYS = 45
const MAX_ITEMS = 8

type Draft = Omit<ResultUpdate, 'aiSummary'>

function base(r: Resource, inResults: boolean, source: string) {
  return {
    resourceId: r.id,
    resourceName: r.name,
    organization: r.organization,
    source: { label: source, url: r.website ?? null },
    verification: r.verification,
    lastVerified: r.lastVerified ?? null,
    inResults,
  }
}

const within = (iso: string | undefined, now: number, days: number) => {
  if (!iso) return false
  const ms = new Date(iso).getTime() - now
  return ms > 0 && ms <= days * DAY
}

/**
 * Collects updates that trace back to a listing record or a recorded change.
 * Nothing here is generated: every draft is a fact the listing already holds.
 */
function collect(entry: SearchHistoryEntry): Draft[] {
  const now = Date.now()
  const resultIds = new Set(entry.response.results.map((rec) => rec.resource.id))
  const categories = new Set(entry.response.interpretation.categories)
  const since = now - CHANGE_WINDOW_DAYS * DAY
  const drafts: Draft[] = []

  for (const c of db.changes) {
    if (new Date(c.at).getTime() < since || !c.source.trim()) continue
    const r = db.resources.get(c.resourceId)
    if (!r) continue
    const inResults = resultIds.has(r.id)
    const isNewMatch =
      c.kind === 'new_resource' && !inResults && r.status === 'published' && c.at > entry.createdAt && r.categories.some((k) => categories.has(k))
    if (!inResults && !isNewMatch) continue
    drafts.push({ id: c.id, kind: c.kind, date: c.at, facts: c.fields, ...base(r, inResults, c.source) })
  }

  for (const id of resultIds) {
    const r = db.resources.get(id)
    if (!r || r.status !== 'published' || !r.source.trim()) continue
    const recordDate = r.lastVerified ?? r.updatedAt
    if (within(r.deadline, now, DEADLINE_WINDOW_DAYS)) {
      drafts.push({
        id: `deadline-${r.id}-${r.deadline!.slice(0, 10)}`,
        kind: 'deadline_soon',
        date: recordDate,
        facts: [{ field: 'deadline', before: null, after: r.deadline!.slice(0, 10) }],
        ...base(r, true, r.source),
      })
    }
    if (r.registrationRequired && within(r.startDate, now, ENROLLMENT_WINDOW_DAYS)) {
      drafts.push({
        id: `enroll-${r.id}-${r.startDate!.slice(0, 10)}`,
        kind: 'enrollment_soon',
        date: recordDate,
        facts: [{ field: 'startDate', before: null, after: r.startDate!.slice(0, 10) }],
        ...base(r, true, r.source),
      })
    }
  }

  return drafts
    .sort((a, b) => Number(b.inResults) - Number(a.inResults) || b.date.localeCompare(a.date))
    .slice(0, MAX_ITEMS)
}

/* ---------- AI summaries: reword the facts, never add to them ---------- */

const summaryCache = new Map<string, string | null>()

const describeValue = (field: ChangedField['field'], v: string | null) => {
  if (v === null) return 'not listed'
  if (field === 'deadline' || field === 'startDate') {
    const d = new Date(`${v}T12:00:00`)
    return `${v} (${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`
  }
  return v
}

function factText(d: Draft) {
  const lines = d.facts.map((f) => `${f.field}: ${f.before === null && d.kind !== 'new_resource' && !d.kind.endsWith('_soon') ? 'not listed' : f.before === null ? '' : describeValue(f.field, f.before) + ' -> '}${describeValue(f.field, f.after)}`)
  return [`update type: ${d.kind}`, `program: ${d.resourceName}`, `organization: ${d.organization}`, ...lines].join('\n')
}

/** Rejects summaries that mention any number not present in the facts, a cheap guard against invented dates or amounts. */
function onlyKnownNumbers(summary: string, facts: string) {
  const known = new Set((facts.match(/\d+/g) ?? []).map(Number))
  return (summary.match(/\d+/g) ?? []).every((n) => known.has(Number(n)))
}

const summariesSchema = z.object({
  summaries: z.array(z.object({ id: z.string(), summary: z.string() })),
})

async function summarize(drafts: Draft[], lang: Lang): Promise<Map<string, string | null>> {
  const keyFor = (d: Draft) => `${lang}:${d.id}:${factText(d)}`
  const pending = drafts.filter((d) => !summaryCache.has(keyFor(d)))
  if (pending.length) {
    try {
      const { output } = await generateText({
        model: AI_MODEL,
        output: Output.object({ schema: summariesSchema }),
        system:
          'You write one short, plain-language sentence for each community program update so residents understand what changed. ' +
          'Use ONLY the facts given for that update. Do not add dates, amounts, requirements, reasons, advice, or any detail that is not in the facts. ' +
          'Do not say a program is guaranteed or that someone qualifies. Keep each sentence under 30 words.',
        prompt:
          `Write each summary in ${LANGUAGE_META[lang].english}.\n\n` +
          pending.map((d) => `[id: ${d.id}]\n${factText(d)}`).join('\n\n'),
        abortSignal: AbortSignal.timeout(10000),
      })
      const byId = new Map(output.summaries.map((s) => [s.id, s.summary.trim()]))
      for (const d of pending) {
        const s = byId.get(d.id)
        summaryCache.set(keyFor(d), s && onlyKnownNumbers(s, factText(d)) ? s : null)
      }
    } catch (error) {
      // Leave uncached so the next check retries; the verified facts still show without a summary.
      console.error('[updates] AI summary failed', error)
      return new Map(drafts.map((d) => [d.id, summaryCache.get(keyFor(d)) ?? null]))
    }
  }
  return new Map(drafts.map((d) => [d.id, summaryCache.get(keyFor(d)) ?? null]))
}

export async function buildUpdates(entry: SearchHistoryEntry, lang: Lang): Promise<ResultUpdate[]> {
  const drafts = collect(entry)
  if (!drafts.length) return []
  const summaries = await summarize(drafts, lang)
  return drafts.map((d) => ({ ...d, aiSummary: summaries.get(d.id) ?? null }))
}
