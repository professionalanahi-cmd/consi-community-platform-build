'use client'

import type { SearchHistoryEntry } from '@/lib/types'
import { useApp } from '../app-provider'

export function CriteriaSummary({ criteria }: { criteria: SearchHistoryEntry['criteria'] }) {
  const { t } = useApp()
  const place = criteria.location?.label ?? criteria.location?.zip ?? t('history.anywhere')
  const filterCount = Object.values(criteria.filters ?? {}).filter((v) => v && v !== 'any').length
  const parts = [place, t('history.within', { n: criteria.radiusMiles })]
  if (filterCount > 0) parts.push(t('history.filters', { n: filterCount }))
  return <p className="text-base text-muted-foreground">{parts.join(' · ')}</p>
}

export function MatchCount({ total }: { total: number }) {
  const { t } = useApp()
  return (
    <p className="text-base font-semibold text-accent-foreground">
      {total === 1 ? t('history.match') : t('history.matches', { n: total })}
    </p>
  )
}
