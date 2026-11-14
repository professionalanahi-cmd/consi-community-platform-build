'use client'

import { BadgeCheck, CircleDashed, TriangleAlert } from 'lucide-react'
import type { DisplayStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'

const META = {
  verified: { icon: BadgeCheck, cls: 'bg-accent text-accent-foreground', help: 'status.verifiedHelp' },
  potential_match: { icon: CircleDashed, cls: 'bg-muted text-foreground', help: 'status.potentialHelp' },
  needs_review: { icon: TriangleAlert, cls: 'bg-[#f6ecd2] text-[#5c4510]', help: 'status.reviewHelp' },
} as const

export function StatusBadge({ status, showHelp = false }: { status: DisplayStatus; showHelp?: boolean }) {
  const { t } = useApp()
  const { icon: Icon, cls, help } = META[status]
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', cls)}>
        <Icon className="size-4" aria-hidden="true" />
        {t(`status.${status}`)}
      </span>
      {showHelp && <span className="text-sm text-muted-foreground">{t(help)}</span>}
    </div>
  )
}
