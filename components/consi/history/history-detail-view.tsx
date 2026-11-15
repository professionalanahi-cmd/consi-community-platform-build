'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useResourceActions } from '@/hooks/use-resource-actions'
import { formatDate } from '@/lib/prefs'
import type { SearchHistoryEntry } from '@/lib/types'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'
import { RecommendationCard } from '../results/recommendation-card'
import { CriteriaSummary, MatchCount } from './criteria-summary'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

export function HistoryDetailView({ id }: { id: string }) {
  const { t, lang } = useApp()
  const { data, error } = useSWR<{ entry: SearchHistoryEntry }>(`/api/history/${encodeURIComponent(id)}`, fetcher, {
    revalidateOnFocus: false,
  })
  const { savedIds, remindedIds, toggleSave, remind } = useResourceActions()

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={t('history.title')} backHref="/more/history" />
        <p role="alert" className="text-lg">{t('history.notFound')}</p>
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">{t('common.loading')}</p>

  const { entry } = data
  const results = entry.response.results

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`“${entry.criteria.query}”`} backHref="/more/history">
        <div className="flex flex-col gap-1">
          <CriteriaSummary criteria={entry.criteria} />
          <MatchCount total={entry.total} />
        </div>
      </PageHeader>

      <p className="rounded-2xl bg-muted p-4 text-base leading-relaxed">
        {t('history.snapshot', { date: formatDate(entry.createdAt, lang) })}
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-5 ring-1 ring-border">
          <p className="text-lg font-semibold">{t('results.none')}</p>
        </div>
      ) : (
        <>
          <p className="text-base text-muted-foreground">{t('results.showing', { shown: results.length, total: entry.total })}</p>
          <ol className="flex flex-col gap-4">
            {results.map((rec, i) => (
              <li key={rec.resource.id}>
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
        </>
      )}

      <Link href="/more/history" className="min-h-12 content-center self-start px-2 text-base font-semibold text-mint">
        {t('history.back')}
      </Link>
    </div>
  )
}
