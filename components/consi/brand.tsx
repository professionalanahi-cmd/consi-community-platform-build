'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useApp } from './app-provider'
import { Orb } from './orb'

export function Brand({ href = '/', className }: { href?: string; className?: string }) {
  const { t } = useApp()
  const tagline = t('brand.tagline')
  return (
    <Link
      href={href}
      aria-label={`CONSI — ${tagline}`}
      className={cn('flex min-h-11 min-w-0 items-center gap-2.5 rounded-full pr-3 transition-opacity hover:opacity-80', className)}
    >
      <Orb size={40} className="animate-none!" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-heading text-xl font-bold leading-none tracking-tight">CONSI</span>
        <span className="hidden truncate text-sm leading-tight text-muted-foreground sm:block">{tagline}</span>
      </span>
    </Link>
  )
}
