import { z } from 'zod'
import { data, newId } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { liveRegisterOrg } from '@/lib/server/live'
import { setDemoRole } from '@/lib/server/session'
import type { Provider } from '@/lib/types'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  website: z.string().trim().url().max(200).optional().or(z.literal('')),
})

/**
 * An organization signs itself up to list its programs. The record is stored durably in the live engine
 * (falling back to this app's own store), then the visitor is taken to their provider dashboard.
 * DEMO ACCESS: no password yet; a real deployment puts sign-in in front of this.
 */
export const POST = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) throw new HttpError(400, "Enter your organization's name. Email and website are optional, but must be valid if given.")
  const input = parsed.data
  let provider: Provider | null = null
  try {
    provider = await liveRegisterOrg(input)
  } catch (e) {
    console.error('[register] live engine unavailable', e)
  }
  if (!provider) {
    provider = { id: newId('prov'), name: input.name, contactEmail: input.contactEmail ?? '', website: input.website || undefined, status: 'pending', isSample: false, createdAt: new Date().toISOString() }
    await data.providers.save(provider)
  }
  await setDemoRole('provider', provider.id)
  return { provider }
})
