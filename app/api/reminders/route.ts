import { z } from 'zod'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'
import { guest, newId } from '@/lib/server/store'

export const GET = handle(async () => {
  const g = guest(await getGuestId())
  return { reminders: [...g.reminders].sort((a, b) => a.date.localeCompare(b.date)) }
})

const body = z.object({
  title: z.string().trim().min(1).max(140),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['deadline', 'registration', 'start', 'follow_up']).default('follow_up'),
  resourceId: z.string().max(64).optional(),
})

export const POST = handle(async (req: Request) => {
  const input = body.parse(await req.json())
  const g = guest(await getGuestId())
  const dup = g.reminders.find((r) => r.resourceId && r.resourceId === input.resourceId && r.kind === input.kind)
  if (dup) return { reminder: dup }
  const reminder = { id: newId('rem'), createdAt: new Date().toISOString(), ...input }
  g.reminders.push(reminder)
  return { reminder }
})

export const DELETE = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id')
  const g = guest(await getGuestId())
  g.reminders = g.reminders.filter((r) => r.id !== id)
  return { ok: true }
})
