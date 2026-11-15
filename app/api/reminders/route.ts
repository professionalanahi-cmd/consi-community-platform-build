import { z } from 'zod'
import { data, newId } from '@/lib/server/data'
import { handle } from '@/lib/server/http'
import { getGuestId } from '@/lib/server/session'

export const GET = handle(async () => {
  const reminders = await data.guests.listReminders(await getGuestId())
  return { reminders: reminders.sort((a, b) => a.date.localeCompare(b.date)) }
})

const body = z.object({
  title: z.string().trim().min(1).max(140),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['deadline', 'registration', 'start', 'follow_up']).default('follow_up'),
  resourceId: z.string().max(64).optional(),
})

export const POST = handle(async (req: Request) => {
  const input = body.parse(await req.json())
  const guestId = await getGuestId()
  const existing = await data.guests.listReminders(guestId)
  const dup = existing.find((r) => r.resourceId && r.resourceId === input.resourceId && r.kind === input.kind)
  if (dup) return { reminder: dup }
  const reminder = await data.guests.addReminder(guestId, { id: newId('rem'), createdAt: new Date().toISOString(), ...input })
  return { reminder }
})

export const DELETE = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  await data.guests.removeReminder(await getGuestId(), id)
  return { ok: true }
})
