import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle, HttpError } from '@/lib/server/http'
import { setDemoRole } from '@/lib/server/session'

const schema = z.object({ role: z.enum(['resident', 'provider', 'admin']), providerId: z.string().optional() })

export const POST = handle(async (req: Request) => {
  const { role, providerId } = schema.parse(await req.json())
  if (role === 'provider' && (!providerId || !(await data.providers.get(providerId)))) throw new HttpError(400, 'Choose a provider organization')
  await setDemoRole(role, providerId)
  return { ok: true }
})
