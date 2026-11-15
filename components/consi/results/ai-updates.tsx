'use client'

import { BadgeCheck, CircleAlert, ExternalLink, Sparkles } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { LANGUAGE_META, type DictKey } from '@/lib/i18n'
import type { ChangedField, ResultUpdate, ResultUpdatesResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'

const fetchUpdates = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json() as Promise<ResultUpdatesResponse>
  })

/** `watchKey` changes whenever the active results change, so updates are re-checked for the new search. */
export function AiUpdates({ watchKey }: { watchKey: string | null }) {
  const { t, lang } = useApp()
  const [pending, setPending] = useState<boolean | null>(null)
  const { data, error, isLoading, mutate } = useSWR<ResultUpdatesResponse>(
    ['ai-updates', lang, watchKey ?? 'none'],
    () => fetchUpdates(`/api/results/updates?lang=${lang}`),
    { revalidateOnFocus: false, refreshInterval: 5 * 60 * 1000 },
  )
  const enabled = pending ?? data?.enabled ?? false

  const toggle = async () => {
    const next = !enabled
    setPending(next)
    try {
      await fetch('/api/results/updates', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: next }) })
      await mutate()
    } finally {
      setPending(null)
    }
  }

  const htmlLang = LANGUAGE_META[lang].htmlLang
  const time = data ? new Date(data.checkedAt).toLocaleTimeString(htmlLang, { hour: 'numeric', minute: '2-digit' }) : ''

  return (
    <section aria-labelledby="ai-updates-title" className="flex flex-col gap-4 rounded-3xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="ai-updates-title" className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Sparkles className="size-5 text-mint" aria-hidden="true" />
            {t('updates.title')}
          </h2>
          <p id="ai-updates-hint" className="text-base leading-relaxed text-muted-foreground text-pretty">
            {t('updates.hint')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="ai-updates-title"
          aria-describedby="ai-updates-hint ai-updates-status"
          disabled={!data || pending !== null}
          onClick={toggle}
          className={cn(
            'relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors motion-reduce:transition-none disabled:opacity-60',
            enabled ? 'bg-mint' : 'bg-muted ring-1 ring-border',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('size-6 rounded-full bg-card shadow-sm transition-transform motion-reduce:transition-none', enabled ? 'translate-x-6' : 'translate-x-0')}
          />
        </button>
      </div>

      <p id="ai-updates-status" className={cn('text-sm font-semibold', enabled ? 'text-mint' : 'text-muted-foreground')}>
        {t(enabled ? 'updates.on' : 'updates.off')}
        {enabled && data?.enabled && data.hasActiveResults && <span className="font-normal text-muted-foreground">{` · ${t('updates.checked', { time })}`}</span>}
      </p>

      {enabled && (
        <div aria-live="polite" aria-busy={isLoading || pending !== null} className="flex flex-col gap-3">
          {error ? (
            <p className="text-base text-muted-foreground">{t('updates.error')}</p>
          ) : !data || pending !== null || !data.enabled ? (
            <p className="text-base text-muted-foreground">{t('updates.loading')}</p>
          ) : !data.hasActiveResults ? (
            <p className="text-base text-muted-foreground">{t('updates.noResults')}</p>
          ) : data.items.length === 0 ? (
            <p className="text-base leading-relaxed text-muted-foreground">{t('updates.none')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.items.map((item) => (
                <li key={item.id}>
                  <UpdateItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function UpdateItem({ item }: { item: ResultUpdate }) {
  const { t, lang } = useApp()
  const htmlLang = LANGUAGE_META[lang].htmlLang
  const fmtDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(htmlLang, { month: 'short', day: 'numeric', year: 'numeric' })

  const fmtValue = (f: ChangedField, v: string | null) => {
    if (v === null) return t('updates.notListed')
    if (f.field === 'deadline' || f.field === 'startDate') return fmtDate(v)
    if (f.field === 'availability' || f.field === 'status') return t(`updates.value.${v}` as DictKey)
    return v
  }
  const showBefore = item.kind !== 'new_resource' && !item.kind.endsWith('_soon')
  const verified = item.verification === 'verified'

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {item.inResults ? t('updates.date', { date: fmtDate(item.date) }) : `${t('updates.newMatch')} · ${fmtDate(item.date)}`}
        </p>
        <h3 className="text-lg font-semibold leading-snug text-balance">{t(`updates.kind.${item.kind}` as DictKey, { name: item.resourceName })}</h3>
        <p className="text-sm text-muted-foreground">{item.organization}</p>
      </header>

      {item.aiSummary && (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-mint">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t('updates.aiSummary')}
          </p>
          <p className="text-base leading-relaxed text-pretty">{item.aiSummary}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('updates.aiNote')}</p>
        </div>
      )}

      {item.facts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-card p-3">
          <p className="text-sm font-semibold">{t('updates.facts')}</p>
          <dl className="flex flex-col gap-2">
            {item.facts.map((f) => (
              <div key={f.field} className="flex flex-col gap-0.5">
                <dt className="text-sm text-muted-foreground">{t(`updates.field.${f.field}` as DictKey)}</dt>
                <dd className="flex flex-col text-base leading-relaxed">
                  {showBefore && (
                    <span className="text-muted-foreground">
                      {`${t('updates.was')}: `}
                      <span className="line-through">{fmtValue(f, f.before)}</span>
                    </span>
                  )}
                  <span>
                    {showBefore && `${t('updates.now')}: `}
                    <span className="font-semibold">{fmtValue(f, f.after)}</span>
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <footer className="flex flex-col gap-1.5 text-sm">
        <p className={cn('flex items-center gap-1.5 font-semibold', verified ? 'text-mint' : 'text-muted-foreground')}>
          {verified ? <BadgeCheck className="size-4" aria-hidden="true" /> : <CircleAlert className="size-4" aria-hidden="true" />}
          {t(verified ? 'updates.verified' : 'updates.unverified')}
          <span className="font-normal text-muted-foreground">
            {` · ${item.lastVerified ? t('updates.lastVerified', { date: fmtDate(item.lastVerified) }) : t('updates.neverVerified')}`}
          </span>
        </p>
        <p className="text-muted-foreground">{t('updates.source', { source: item.source.label })}</p>
        {item.source.url && (
          <a
            href={item.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 self-start font-semibold text-mint underline-offset-4 hover:underline"
          >
            {t('updates.visit')}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
      </footer>
    </article>
  )
}
