'use client'

import { Bell, Bookmark, CalendarDays, ChevronRight, History, Info, LifeBuoy, PlayCircle, Building2, Trash2, Download } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'
import { formatDate } from '@/lib/prefs'
import type { Reminder, Resource } from '@/lib/types'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function MoreView() {
  const { t } = useApp()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('more.title')} backHref="/" />
      <Link href="/more/history" className="flex items-center gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm hover:bg-muted">
        <History className="size-6 shrink-0 text-accent-foreground" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading text-xl font-semibold">{t('history.title')}</span>
          <span className="text-base text-muted-foreground">{t('history.desc')}</span>
        </span>
        <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
      <Link href="/more/demo" className="flex items-center gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm hover:bg-muted">
        <PlayCircle className="size-6 shrink-0 text-accent-foreground" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading text-xl font-semibold">{t('more.demo')}</span>
          <span className="text-base text-muted-foreground">{t('more.demoDesc')}</span>
        </span>
        <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
      <SavedSection />
      <RemindersSection />
      <UpdatesSection />
      <Card icon={LifeBuoy} title={t('more.help')}>
        <p className="text-base leading-relaxed text-muted-foreground">{t('more.helpDesc')}</p>
      </Card>
      <Card icon={Info} title={t('more.about')}>
        <p className="text-base leading-relaxed text-muted-foreground">{t('more.aboutDesc')}</p>
      </Card>
      <Link href="/portal" className="flex min-h-14 items-center gap-3 rounded-[1.75rem] bg-primary px-5 text-lg font-semibold text-primary-foreground">
        <Building2 className="size-6" aria-hidden="true" />
        {t('more.portal')}
      </Link>
    </div>
  )
}

function Card({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
        <Icon className="size-6 text-accent-foreground" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SavedSection() {
  const { t, lang } = useApp()
  const { data, mutate } = useSWR<{ resources: Resource[] }>('/api/saved', fetcher)
  return (
    <Card icon={Bookmark} title={t('more.saved')}>
      {!data ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : data.resources.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('saved.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {data.resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{r.translations[lang]?.name ?? r.name}</p>
                <p className="text-sm text-muted-foreground">{r.organization}</p>
              </div>
              <button
                type="button"
                aria-label={`${t('saved.remove')}: ${r.name}`}
                onClick={async () => {
                  await fetch(`/api/saved?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' })
                  mutate()
                }}
                className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RemindersSection() {
  const { t, lang } = useApp()
  const { data, mutate } = useSWR<{ reminders: Reminder[] }>('/api/reminders', fetcher)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  return (
    <Card icon={CalendarDays} title={t('more.reminders')}>
      {data?.reminders.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {data.reminders.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{formatDate(r.date, lang)}</p>
              </div>
              <div className="flex shrink-0">
                <a href={`/api/reminders/${r.id}/ics`} aria-label={`${t('rem.calendar')}: ${r.title}`} className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
                  <Download className="size-5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  aria-label={`${t('common.delete')}: ${r.title}`}
                  onClick={async () => {
                    await fetch(`/api/reminders?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' })
                    mutate()
                  }}
                  className="flex size-11 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">{data ? t('rem.empty') : t('common.loading')}</p>
      )}
      <form
        className="flex flex-col gap-3 border-t border-border pt-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim() || !date) return
          await fetch('/api/reminders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: title.trim(), date, kind: 'follow_up' }) })
          setTitle('')
          setDate('')
          mutate()
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-base font-medium">{t('rem.titleLabel')}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="min-h-12 rounded-2xl bg-background px-4 text-lg ring-1 ring-border" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-base font-medium">{t('rem.dateLabel')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-12 rounded-2xl bg-background px-4 text-lg ring-1 ring-border" />
        </label>
        <button type="submit" className="min-h-12 rounded-full bg-primary px-5 text-lg font-semibold text-primary-foreground">
          {t('rem.add')}
        </button>
      </form>
    </Card>
  )
}

function UpdatesSection() {
  const { t, lang } = useApp()
  const { data } = useSWR<{ items: { id: string; kind: 'newResource' | 'deadlineSoon' | 'needsReview'; resourceId: string; date: string }[]; resources: Record<string, Resource> }>('/api/updates', fetcher)
  const label = { newResource: t('upd.newResource'), deadlineSoon: t('upd.deadlineSoon'), needsReview: t('upd.needsReview') }
  return (
    <Card icon={Bell} title={t('more.updates')}>
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
    </Card>
  )
}
