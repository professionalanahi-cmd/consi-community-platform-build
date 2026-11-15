'use client'

import useSWR from 'swr'
import type { Recommendation, Reminder } from '@/lib/types'

const getJSON = (url: string) => fetch(url).then((r) => r.json())
const postJSON = <T,>(url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json() as Promise<T>)

/** Save and reminder state shared by active results and history snapshots. */
export function useResourceActions() {
  const { data: savedData, mutate: mutateSaved } = useSWR<{ ids: string[] }>('/api/saved', getJSON)
  const { data: remData, mutate: mutateRem } = useSWR<{ reminders: Reminder[] }>('/api/reminders', getJSON)
  const savedIds = new Set(savedData?.ids ?? [])
  const remindedIds = new Set((remData?.reminders ?? []).map((r) => r.resourceId))

  const toggleSave = async (id: string) => {
    const next = savedIds.has(id)
      ? await fetch(`/api/saved?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => r.json())
      : await postJSON<{ ids: string[] }>('/api/saved', { resourceId: id })
    mutateSaved(next, { revalidate: false })
  }

  const remind = async (rec: Recommendation) => {
    const r = rec.resource
    const date = (r.deadline ?? r.startDate)!.slice(0, 10)
    await postJSON('/api/reminders', { title: rec.display.name, date, kind: r.deadline ? 'deadline' : 'start', resourceId: r.id })
    mutateRem()
  }

  return { savedIds, remindedIds, toggleSave, remind }
}
