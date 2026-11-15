'use client'

import { ArrowLeft, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { useResourceActions } from '@/hooks/use-resource-actions'
import { useSpeaker } from '@/hooks/use-speech'
import { LANGUAGE_META } from '@/lib/i18n'
import type { SearchResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'
import { Orb } from '../orb'
import { AiUpdates } from './ai-updates'
import { ClearResultsToggle } from './clear-results-toggle'
import { FiltersPanel } from './filters-panel'
import { FollowUpCard } from './follow-up-card'
import { RecommendationCard } from './recommendation-card'

const MAP_SIZE = 'h-[min(24rem,52dvh)] md:h-[min(30rem,52dvh)] lg:h-[calc(100dvh-13rem)] lg:max-h-[46rem]'

const ResultsMap = dynamic(() => import('./results-map'), { ssr: false, loading: () => <div className={cn(MAP_SIZE, 'animate-pulse rounded-3xl bg-muted')} /> })

const postJSON = <T,>(url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Request failed')
    return r.json() as Promise<T>
  })

export function ResultsView() {
  const { t, lang, prefs, search, updateSearch, location, resultsReady, takeRestoredResults, clearResults } = useApp()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [refining, setRefining] = useState(false)
  const { speak } = useSpeaker(LANGUAGE_META[lang].speech, prefs.voiceSpeed)
  const { savedIds, remindedIds, toggleSave, remind } = useResourceActions()

  const body = search
    ? {
        query: search.query,
        lang,
        location,
        radiusMiles: search.radiusMiles,
        answers: search.answers,
        filters: search.filters,
        page: search.page,
        historyId: search.historyId,
      }
    : null
  const { data, error, isLoading, mutate } = useSWR<SearchResponse>(
    body ? ['search', JSON.stringify(body), search?.nonce] : null,
    () => takeRestoredResults(body!.historyId) ?? postJSON<SearchResponse>('/api/search', body),
    { keepPreviousData: true, revalidateOnFocus: false },
  )

  const spokenFor = useRef<string | null>(null)
  useEffect(() => {
    if (!prefs.autoRead || !data || isLoading) return
    const key = `${search?.query}-${search?.nonce}`
    if (spokenFor.current === key) return
    spokenFor.current = key
    const names = data.results.slice(0, 3).map((r) => r.display.name).join('. ')
    speak(`${data.interpretation.summary}. ${names}`)
  }, [data, isLoading, prefs.autoRead, search?.query, search?.nonce, speak])

  if (!search) {
    if (!resultsReady) {
      return (
        <div className="flex flex-1 items-center justify-center" aria-busy="true">
          <Orb size={64} state="thinking" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <Orb size={96} />
        <h1 className="font-heading text-2xl font-semibold text-balance">{t('results.empty')}</h1>
        <Link href="/" className="flex min-h-14 items-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
          {t('results.goHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full pr-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t('common.back')}
        </Link>
        <p className="text-base font-medium text-muted-foreground">{t('results.youAsked')}</p>
        <h1 className="max-w-3xl font-heading text-2xl font-semibold leading-snug text-balance md:text-3xl md:leading-snug">{`“${search.query}”`}</h1>
        {data && <p className="max-w-3xl text-lg leading-relaxed text-pretty">{data.interpretation.summary}</p>}
      </header>

      {data?.followUp && (
        <FollowUpCard
          q={data.followUp}
          onAnswer={(value) => updateSearch({ answers: { ...search.answers, [data.followUp!.key]: value }, page: 1 })}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('results.viewAs')} className="flex rounded-full bg-muted p-1" data-guide="view-toggle">
          {(['list', 'map'] as const).map((v) => {
            const Icon = v === 'list' ? List : MapIcon
            return (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn('flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold', view === v ? 'bg-card shadow-sm' : 'text-muted-foreground')}
              >
                <Icon className="size-5" aria-hidden="true" />
                {t(v === 'list' ? 'results.list' : 'results.map')}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          aria-expanded={refining}
          onClick={() => setRefining(!refining)}
          data-guide="refine"
          className="flex min-h-12 items-center gap-2 rounded-full bg-card px-4 text-base font-semibold ring-1 ring-border hover:bg-muted"
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {t('results.refine')}
        </button>
        <Link href="/" className="ml-auto min-h-12 content-center px-2 text-base font-semibold text-mint">
          {t('results.newSearch')}
        </Link>
      </div>

      {refining && <FiltersPanel onClose={() => setRefining(false)} />}

      <div aria-live="polite" aria-busy={isLoading} className="flex flex-col gap-4">
        {isLoading && !data && (
          <div className="flex items-center gap-3 rounded-3xl bg-card p-5 ring-1 ring-border">
            <Orb size={44} state="thinking" />
            <p className="text-lg">{t('results.thinking')}</p>
          </div>
        )}

        {error && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-3xl bg-card p-5 ring-1 ring-border">
            <p className="text-lg">{t('common.error')}</p>
            <button type="button" onClick={() => mutate()} className="min-h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground">
              {t('common.retry')}
            </button>
          </div>
        )}

        {data && (
          <>
            {data.radiusExpanded && <p className="rounded-2xl bg-muted p-4 text-base">{t('results.expanded', { n: data.radiusMiles })}</p>}
            {data.results.length === 0 ? (
              <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 ring-1 ring-border">
                <p className="text-lg font-semibold">{t('results.none')}</p>
                <p className="text-base leading-relaxed text-muted-foreground">{t('results.noneHint')}</p>
              </div>
            ) : (
              <>
                <p className="text-base text-muted-foreground">{t('results.showing', { shown: data.results.length, total: data.total })}</p>
                {/* Wide screens: cards flow in two columns, or sit beside a map that stays in view while the list scrolls. */}
                <div className={cn('flex flex-col gap-4', view === 'map' && 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-6')}>
                  {view === 'map' && (
                    <div className="isolate flex flex-col gap-2 lg:sticky lg:top-24">
                      <ResultsMap className={MAP_SIZE} results={data.results} origin={data.origin} milesLabel={(n) => t('results.miles', { n: n.toFixed(1) })} />
                      <p className="text-sm text-muted-foreground">{t('results.mapList')}</p>
                    </div>
                  )}
                  <ol className={cn('grid items-start gap-4', view === 'list' && 'md:grid-cols-2')}>
                    {data.results.map((rec, i) => (
                      <li key={rec.resource.id} className="min-w-0">
                        <RecommendationCard
                          rec={rec}
                          index={i}
                          saved={savedIds.has(rec.resource.id)}
                          onToggleSave={() => toggleSave(rec.resource.id)}
                          reminded={remindedIds.has(rec.resource.id)}
                          onRemind={() => remind(rec)}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
                {data.page < data.pageCount && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateSearch({ page: search.page + 1 })}
                    className="min-h-14 rounded-full bg-card px-8 text-lg font-semibold ring-1 ring-border hover:bg-muted disabled:opacity-60 md:min-w-72 md:self-center"
                  >
                    {isLoading ? t('common.loading') : t('results.showMore')}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {data && <AiUpdates watchKey={`${search.historyId ?? ''}-${search.nonce}-${data.results.length}`} />}

      {data && <ClearResultsToggle onConfirm={clearResults} />}
    </div>
  )
}
