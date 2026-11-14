import { generateText, Output } from 'ai'
import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { liveExtract } from '@/lib/server/live'
import { AI_MODEL } from '@/lib/server/matching'
import { requireRole } from '@/lib/server/session'
import { CATEGORIES, LANGUAGES } from '@/lib/types'

export const maxDuration = 60

const MAX_BYTES = 6 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain']

const extracted = z.object({
  organization: z.string().nullable(),
  name: z.string().nullable(),
  summary: z.string().nullable().describe('Plain-language 1-2 sentence summary'),
  categories: z.array(z.enum(CATEGORIES)),
  cost: z.enum(['free', 'subsidized', 'paid']).nullable(),
  costDetail: z.string().nullable(),
  ageGroups: z.array(z.enum(['child', 'teen', 'adult', 'senior'])),
  eligibilityText: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  zip: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  languages: z.array(z.enum(LANGUAGES)),
  schedule: z.string().nullable(),
  deadline: z.string().nullable().describe('YYYY-MM-DD if a deadline is stated'),
  startDate: z.string().nullable().describe('YYYY-MM-DD if a start date is stated'),
  registrationRequired: z.boolean().nullable(),
  sourceLanguage: z.enum(LANGUAGES).describe('Main language of the flyer'),
  rawText: z.string().describe('All readable text on the flyer'),
  uncertainFields: z.array(z.string()).describe('Field names that were missing, unclear, or guessed'),
})

export const POST = handle(async (req: Request) => {
  await requireRole('provider')
  const form = await req.formData()
  const file = form.get('file')
  const pasted = String(form.get('text') ?? '').slice(0, 6000)
  if (!(file instanceof File) && !pasted.trim()) throw new HttpError(400, 'Upload a flyer or paste its text')

  const content: ({ type: 'text'; text: string } | { type: 'file'; data: Uint8Array; mediaType: string })[] = [
    {
      type: 'text',
      text: 'Extract a community program listing from this flyer. Only use information that is actually present. Use null for anything missing and list it in uncertainFields. Today is ' + new Date().toISOString().slice(0, 10) + '.',
    },
  ]
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) throw new HttpError(413, 'File is larger than 6 MB')
    if (!ALLOWED.includes(file.type)) throw new HttpError(415, 'Use a PNG, JPG, WEBP, PDF, or TXT file')
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (file.type === 'text/plain') content.push({ type: 'text', text: new TextDecoder().decode(bytes).slice(0, 6000) })
    else content.push({ type: 'file', data: bytes, mediaType: file.type })
  }
  if (pasted.trim()) content.push({ type: 'text', text: `Flyer text:\n${pasted}` })

  // Text flyers go to the live engine's extractor first (Claude Haiku). Images and PDFs use the model below.
  const flyer = file instanceof File && file.size > 0 ? { name: file.name, mediaType: file.type } : { name: 'Pasted text', mediaType: 'text/plain' }
  const plain = content.slice(1).every((c) => c.type === 'text') ? content.slice(1).map((c) => (c.type === 'text' ? c.text : '')).join('\n') : ''
  if (plain) {
    const fields = await liveExtract(plain.replace(/^Flyer text:\n/, ''))
    if (fields) return { fields, flyer }
  } else if (file instanceof File && file.size > 0 && file.size <= 4 * 1024 * 1024) {
    // Photo or PDF of a flyer: the live engine reads it with Claude vision.
    const data = Buffer.from(await file.arrayBuffer()).toString('base64')
    const fields = await liveExtract(pasted, { mediaType: file.type, data })
    if (fields) return { fields, flyer }
  }

  const { output } = await generateText({
    model: AI_MODEL,
    output: Output.object({ schema: extracted }),
    messages: [{ role: 'user', content }],
    abortSignal: AbortSignal.timeout(30000),
  })

  return {
    fields: output,
    flyer: file instanceof File && file.size > 0 ? { name: file.name, mediaType: file.type } : { name: 'Pasted text', mediaType: 'text/plain' },
  }
})
