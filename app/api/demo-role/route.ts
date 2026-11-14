import { z } from 'zod'
import { handle, HttpError } from '@/lib/server/http'
import { setDemoRole } from '@/lib/server/session'
import { db } from '@/lib/server/store'

const schema = z.object({ role: z.enum(['resident', 'provider', 'admin']), providerId: z.string().optional() })

export const POST = handle(async (req: Request) => {
  const { role, providerId } = schema.parse(await req.json())
  if (role === 'provider' && (!providerId || !db.providers.has(providerId))) throw new HttpError(400, 'Choose a provider organization')
  await setDemoRole(role, providerId)
  return { ok: true }
})
