'use client'

import type { ListingStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'

const TONE: Record<ListingStatus, string> = {
  draft: 'bg-muted text-foreground',
  submitted: 'bg-accent text-accent-foreground',
  under_review: 'bg-accent text-accent-foreground',
  approved: 'bg-mint text-mint-foreground',
  published: 'bg-mint text-mint-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
  paused: 'bg-muted text-foreground',
  suspended: 'bg-destructive text-destructive-foreground',
  removed: 'bg-muted text-muted-foreground',
}

export function StatusPill({ status }: { status: ListingStatus }) {
  const { t } = useApp()
  return <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold', TONE[status])}>{t(`portal.lstatus.${status}`)}</span>
}
