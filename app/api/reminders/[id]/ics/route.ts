import { getGuestId } from '@/lib/server/session'
import { guest } from '@/lib/server/store'

const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const reminder = guest(await getGuestId()).reminders.find((r) => r.id === id)
  if (!reminder) return new Response('Not found', { status: 404 })
  const d = reminder.date.replaceAll('-', '')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CONSI//Reminders//EN',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@consi`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:${esc(reminder.title)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(reminder.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="consi-reminder.ics"`,
    },
  })
}
