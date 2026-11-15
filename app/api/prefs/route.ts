import { z } from 'zod'
import { DEFAULT_PREFS } from '@/lib/prefs'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { data } from '@/lib/server/data'
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
  soundEffects: z.boolean().default(DEFAULT_PREFS.soundEffects),
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
  const prefs = await data.guests.getPrefs(await getGuestId())
  return { prefs: { ...DEFAULT_PREFS, ...prefs }, stored: Boolean(prefs) }
})

export const PUT = handle(async (req: Request) => {
  const prefs = await data.guests.setPrefs(await getGuestId(), schema.parse(await req.json()))
  return { prefs, stored: true }
})

/** "Delete my data": removes everything tied to this guest. */
export const DELETE = handle(async () => {
  await data.guests.deleteAll(await getGuestId())
  return { prefs: DEFAULT_PREFS, stored: false }
})
