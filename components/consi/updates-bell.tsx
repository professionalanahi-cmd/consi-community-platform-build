'use client'

import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { formatDate } from '@/lib/prefs'
import type { Resource } from '@/lib/types'
import { useApp } from './app-provider'

type UpdatesResponse = {
  items: { id: string; kind: 'newResource' | 'deadlineSoon' | 'needsReview'; resourceId: string; date: string }[]
  resources: Record<string, Resource>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Bell in the app header. Opens the community updates feed (new listings, deadlines, listings to re-check). */
export function UpdatesBell() {
  const { t, lang } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useSWR<UpdatesResponse>('/api/updates', fetcher)
  const count = data?.items.length ?? 0
  const label = { newResource: t('upd.newResource'), deadlineSoon: t('upd.deadlineSoon'), needsReview: t('upd.needsReview') }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={count ? `${t('more.updates')} (${count})` : t('more.updates')}
        aria-expanded={open}
        aria-controls="updates-panel"
        onClick={() => setOpen(!open)}
        className="relative flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-border hover:bg-muted"
      >
        <Bell className="size-5" aria-hidden="true" />
        {count > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-5 text-primary-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <section
          id="updates-panel"
          aria-label={t('more.updates')}
          className="fixed inset-x-3 top-16 z-40 flex max-h-[70vh] flex-col gap-2 overflow-y-auto rounded-[1.75rem] bg-card p-5 shadow-lg ring-1 ring-border sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
              <Bell className="size-6 text-accent-foreground" aria-hidden="true" />
              {t('more.updates')}
            </h2>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {!data ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : data.items.length === 0 ? (
            <p className="text-base text-muted-foreground">{t('upd.empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.items.map((i) => {
                const r = data.resources[i.resourceId]
                return (
                  <li key={i.id} className="flex flex-col py-3">
                    <span className="text-sm font-semibold text-accent-foreground">{label[i.kind]}</span>
                    <span className="text-lg">{r?.translations[lang]?.name ?? r?.name}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(i.date, lang)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
