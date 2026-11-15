import { z } from 'zod'
import { data } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { liveReferral } from '@/lib/server/live'

const schema = z.object({ resourceId: z.string().max(64), type: z.enum(['view', 'referral']) })

export const POST = handle(async (req: Request) => {
  const { resourceId, type } = schema.parse(await req.json())
  await data.activity.track(resourceId, type)
  if (type === 'referral') await liveReferral(resourceId)
  return { ok: true }
})
