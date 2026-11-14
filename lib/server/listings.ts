import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { CATEGORIES, LANGUAGES, type Lang, type Resource } from '../types'
import { AI_MODEL } from './matching'

export const listingInput = z.object({
  organization: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(10).max(600),
  categories: z.array(z.enum(CATEGORIES)).min(1).max(4),
  tags: z.array(z.string().trim().max(30)).max(20).default([]),
  cost: z.enum(['free', 'subsidized', 'paid']),
  costDetail: z.string().max(140).optional(),
  ageGroups: z.array(z.enum(['child', 'teen', 'adult', 'senior'])).min(1),
  eligibilityText: z.string().max(600).default(''),
  address: z.string().trim().min(3).max(140),
  city: z.string().trim().min(2).max(60),
  zip: z.string().regex(/^\d{5}$/),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(120).optional().or(z.literal('')),
  website: z.string().url().max(200).optional().or(z.literal('')),
  languages: z.array(z.enum(LANGUAGES)).min(1),
  accessibility: z.array(z.string().max(60)).max(8).default([]),
  transitNearby: z.boolean().default(false),
  registrationRequired: z.boolean().default(false),
  availability: z.enum(['open', 'waitlist', 'seasonal', 'closed']),
  schedule: z.string().max(140).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  sourceLanguage: z.enum(LANGUAGES).default('en'),
  originalFlyer: z.object({ name: z.string().max(200), mediaType: z.string().max(80), text: z.string().max(4000).optional() }).optional(),
  uncertainFields: z.array(z.string().max(40)).max(30).optional(),
})
export type ListingInput = z.infer<typeof listingInput>

/** Turns free-text eligibility into structured rules (residents still confirm with the provider). */
export function rulesFromText(text: string, ageGroups: string[]): Resource['eligibility'] {
  const rules: Resource['eligibility'] = []
  const t = text.toLowerCase()
  const range = t.match(/ages?\s*(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})/)
  if (range) rules.push({ id: 'age', kind: 'age', min: Number(range[1]), max: Number(range[2]), label: `Ages ${range[1]} to ${range[2]}` })
  else if (/(\d{2})\s*(\+|and older|or older)/.test(t)) {
    const n = Number(t.match(/(\d{2})\s*(\+|and older|or older)/)![1])
    rules.push({ id: 'age', kind: 'age', min: n, label: `Ages ${n} and older` })
  } else if (ageGroups.length === 1 && ageGroups[0] === 'senior') rules.push({ id: 'age', kind: 'age', min: 60, label: 'Ages 60 and older' })
  if (/glendale/.test(t)) rules.push({ id: 'res', kind: 'residency', area: 'glendale', label: 'Glendale residents' })
  else if (/county|los angeles/.test(t)) rules.push({ id: 'res', kind: 'residency', area: 'la_county', label: 'Los Angeles County residents' })
  if (/income|low-income|calfresh|medi-cal|ami/.test(t)) rules.push({ id: 'income', kind: 'income', label: 'Household income limits apply' })
  const rest = text.trim()
  if (rest && rules.length === 0) rules.push({ id: 'other', kind: 'other', label: rest.slice(0, 120) })
  return rules
}

const ZIP_POINTS: Record<string, [number, number]> = {
  '91201': [34.1706, -118.2898],
  '91202': [34.1672, -118.2672],
  '91203': [34.1531, -118.2643],
  '91204': [34.1361, -118.2604],
  '91205': [34.1371, -118.2435],
  '91206': [34.1601, -118.2311],
  '91207': [34.1814, -118.2635],
  '91208': [34.1924, -118.2393],
  '91210': [34.1446, -118.2556],
  '91214': [34.2364, -118.2484],
  '90041': [34.1373, -118.2079],
  '90039': [34.1124, -118.2604],
  '91501': [34.1867, -118.3003],
}

export function toResourceFields(input: ListingInput) {
  const [lat, lng] = ZIP_POINTS[input.zip] ?? [34.1425 + (Math.random() - 0.5) * 0.02, -118.2551 + (Math.random() - 0.5) * 0.02]
  const { eligibilityText, address, city, zip, deadline, startDate, email, website, ...rest } = input
  return {
    ...rest,
    email: email || undefined,
    website: website || undefined,
    deadline: deadline || undefined,
    startDate: startDate || undefined,
    eligibility: rulesFromText(eligibilityText, input.ageGroups),
    location: { address, city, zip, lat, lng },
    tags: input.tags.length ? input.tags : input.name.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
  }
}

/** Machine-translate a listing into the other supported languages; flagged for human review. */
export async function autoTranslate(r: Resource): Promise<Resource['translations']> {
  const targets = LANGUAGES.filter((l) => l !== r.sourceLanguage && !r.translations[l])
  if (!targets.length) return r.translations
  try {
    const { output } = await generateText({
      model: AI_MODEL,
      output: Output.object({
        schema: z.object({
          items: z.array(z.object({ lang: z.enum(LANGUAGES), name: z.string(), summary: z.string() })),
        }),
      }),
      prompt: `Translate this community program listing into: ${targets.join(', ')} (hy = Armenian, zh = Simplified Chinese). Keep it plain and friendly. Keep proper names recognizable.\nName: ${r.name}\nSummary: ${r.summary}`,
      abortSignal: AbortSignal.timeout(15000),
    })
    const next = { ...r.translations }
    for (const item of output.items) if (targets.includes(item.lang)) next[item.lang as Lang] = { name: item.name, summary: item.summary, needsReview: true }
    return next
  } catch (error) {
    console.error('[listings] auto-translate failed', error)
    return r.translations
  }
}
