import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { search } from '@/lib/server/matching'
import { getGuestId } from '@/lib/server/session'
import { LANGUAGES } from '@/lib/types'

const schema = z.object({
  query: z.string().max(500).default(''),
  lang: z.enum(LANGUAGES).default('en'),
  location: z
    .object({
      zip: z.string().regex(/^\d{5}$/).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      label: z.string().max(80).optional(),
    })
    .nullable()
    .default(null),
  radiusMiles: z.number().min(1).max(50).default(5),
  answers: z
    .object({
      ageGroup: z.enum(['child', 'teen', 'adult', 'senior', 'skip']).optional(),
      incomeQualifies: z.enum(['yes', 'no', 'skip']).optional(),
      residentOf: z.enum(['glendale', 'la_county', 'other', 'skip']).optional(),
    })
    .default({}),
  filters: z
    .object({
      cost: z.enum(['free', 'subsidized', 'paid', 'any']).optional(),
      ageGroup: z.enum(['child', 'teen', 'adult', 'senior', 'any']).optional(),
      availability: z.enum(['open', 'any']).optional(),
      language: z.enum([...LANGUAGES, 'any']).optional(),
      accessible: z.boolean().optional(),
      transit: z.boolean().optional(),
      noRegistration: z.boolean().optional(),
    })
    .default({}),
  page: z.number().int().min(1).max(20).default(1),
  historyId: z.string().uuid().optional(),
})

export const POST = handle(async (req: Request) => {
  const { historyId, ...body } = schema.parse(await req.json())
  const result = await search(body)
  const newlyShown = result.results.slice((result.page - 1) * 3)
  await Promise.all(newlyShown.map((r) => data.activity.track(r.resource.id, 'impression')))
  if (historyId) {
    const { query, location, radiusMiles, answers, filters, page } = body
    await data.history.record(await getGuestId(), historyId, { query, location, radiusMiles, answers, filters }, page, result)
  }
  return result
})
