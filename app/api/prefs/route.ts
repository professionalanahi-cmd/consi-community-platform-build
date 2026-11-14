import { z } from 'zod'
import { DEFAULT_PREFS } from '@/lib/prefs'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { db, guest } from '@/lib/server/store'
import { LANGUAGES } from '@/lib/types'

const schema = z.object({
  language: z.enum(LANGUAGES).nullable(),
  textSize: z.enum(['normal', 'large', 'xlarge']),
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  simplified: z.boolean(),
  captions: z.boolean(),
  voiceEnabled: z.boolean(),
  voiceSpeed: z.number().min(0.6).max(1.4),
  autoRead: z.boolean(),
  useDeviceLocation: z.boolean(),
  defaultRadius: z.number().min(1).max(25),
  savedLocations: z.array(z.object({ label: z.enum(['home', 'work', 'school']), zip: z.string().regex(/^\d{5}$/) })).max(3),
  consentSaveInfo: z.boolean(),
  consentShareWithProviders: z.boolean(),
  notify: z.object({
    newResources: z.boolean(),
    registrationOpenings: z.boolean(),
    deadlines: z.boolean(),
    availabilityChanges: z.boolean(),
    contactChanges: z.boolean(),
  }),
})

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  return { prefs: g.prefs ?? DEFAULT_PREFS, stored: Boolean(g.prefs) }
})

export const PUT = handle(async (req: Request) => {
  const prefs = schema.parse(await req.json())
  const g = guest(await getGuestId())
  g.prefs = prefs
  return { prefs, stored: true }
})

/** "Delete my data": removes everything tied to this guest. */
export const DELETE = handle(async () => {
  db.guests.delete(await getGuestId())
  return { prefs: DEFAULT_PREFS, stored: false }
})
