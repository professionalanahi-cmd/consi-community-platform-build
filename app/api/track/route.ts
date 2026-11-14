import { z } from 'zod'
import { handle } from '@/lib/server/http'
import { track } from '@/lib/server/store'

const schema = z.object({ resourceId: z.string().max(64), type: z.enum(['view', 'referral']) })

export const POST = handle(async (req: Request) => {
  const { resourceId, type } = schema.parse(await req.json())
  track(resourceId, type)
  return { ok: true }
})
