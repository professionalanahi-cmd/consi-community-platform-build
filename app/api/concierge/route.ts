import { generateText, isStepCount, tool } from 'ai'
import { z } from 'zod'
import { LANGUAGE_META } from '@/lib/i18n'
import { handle } from '@/lib/server/http'
import { liveConcierge, liveEnabled } from '@/lib/server/live'
import { AI_MODEL, search } from '@/lib/server/matching'
import { LANGUAGES } from '@/lib/types'

const GUIDE_TARGETS = ['search', 'dictate', 'location', 'refine', 'view-toggle', 'save', 'language', 'text-size', 'voice-settings'] as const

const schema = z.object({
  lang: z.enum(LANGUAGES),
  zip: z.string().regex(/^\d{5}$/).optional(),
  lastQuery: z.string().max(500).optional(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .min(1)
    .max(30),
})

/**
 * Text concierge used in demo mode (and as the brain for typed messages).
 * Runs the same resource search the app uses, so it never invents programs.
 */
export const POST = handle(async (req: Request) => {
  const { lang, zip, lastQuery, messages } = schema.parse(await req.json())
  // Live engine: grounded reply from stored facts (Claude Sonnet). Falls through to the local model on failure.
  if (liveEnabled()) {
    try {
      return await liveConcierge(lang, zip, messages, lastQuery)
    } catch (e) {
      console.error('[concierge] live engine unavailable', e)
    }
  }
  let lastSearch: { query: string; results: { id: string; name: string }[] } | null = null
  let guide: (typeof GUIDE_TARGETS)[number] | null = null

  const { text } = await generateText({
    model: AI_MODEL,
    system: [
      'You are CONSI, a warm, patient community concierge for residents of Glendale and Los Angeles County.',
      `Always reply in ${LANGUAGE_META[lang].english}. Use plain, simple language suitable for being read aloud: 1 to 3 short sentences, no lists, no markdown, no URLs.`,
      'Many users are older adults or not comfortable with technology. Be encouraging and never rush them.',
      'Ask at most one clarifying question at a time, and only when needed.',
      'To find programs, call search_resources. Only mention programs it returns. Never promise eligibility; say a program "may fit" and suggest confirming with the provider.',
      'Mention at most 3 programs by name, and say they can tap "See these results" for details.',
      'If the user asks how to do something in the app (search, speak, change language, text size, map view, refine, save), call highlight_control and explain the step briefly.',
      'If someone describes an emergency, tell them to call 911. For crisis support, mention 988.',
    ].join(' '),
    messages,
    tools: {
      search_resources: tool({
        description: 'Search the verified CONSI resource directory near the resident.',
        inputSchema: z.object({ query: z.string().describe('The need, in the resident’s own words') }),
        execute: async ({ query }) => {
          const res = await search({
            query,
            lang,
            location: zip ? { zip } : null,
            radiusMiles: 5,
            answers: {},
            filters: {},
            page: 1,
          })
          lastSearch = { query, results: res.results.map((r) => ({ id: r.resource.id, name: r.display.name })) }
          return res.results.map((r) => ({
            name: r.display.name,
            summary: r.display.summary,
            status: r.displayStatus,
            distanceMiles: r.distanceMiles,
            mayNeedConfirmation: r.eligibility.filter((e) => e.state !== 'met').map((e) => e.label),
          }))
        },
      }),
      highlight_control: tool({
        description: 'Visually highlight a control in the app to guide the resident.',
        inputSchema: z.object({ target: z.enum(GUIDE_TARGETS) }),
        execute: async ({ target }) => {
          guide = target
          return { highlighted: target }
        },
      }),
    },
    stopWhen: isStepCount(4),
    abortSignal: AbortSignal.timeout(20000),
  })

  return { reply: text, search: lastSearch, guide }
})
