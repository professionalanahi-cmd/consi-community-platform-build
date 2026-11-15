'use client'

import { ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { formatDate } from '@/lib/prefs'
import type { SearchHistorySummary } from '@/lib/types'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'
import { CriteriaSummary, MatchCount } from './criteria-summary'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function HistoryView() {
  const { t, lang } = useApp()
  const { data } = useSWR<{ entries: SearchHistorySummary[] }>('/api/history', fetcher)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('history.title')} backHref="/more">
        <p className="text-base leading-relaxed text-muted-foreground">{t('history.desc')}</p>
      </PageHeader>

      {!data ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : data.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-card p-8 text-center shadow-sm">
          <History className="size-8 text-accent-foreground" aria-hidden="true" />
          <p className="text-lg text-pretty">{t('history.empty')}</p>
          <Link href="/" className="flex min-h-14 items-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
            {t('results.goHome')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/more/history/${e.id}`}
                className="flex items-center gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm hover:bg-muted"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <time dateTime={e.createdAt} className="text-sm text-muted-foreground">
                    {formatDate(e.createdAt, lang)}
                  </time>
                  <p className="text-lg font-semibold text-pretty">&ldquo;{e.criteria.query}&rdquo;</p>
                  <CriteriaSummary criteria={e.criteria} />
                  <MatchCount total={e.total} />
                </div>
                <span className="sr-only">{t('history.view')}</span>
                <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
