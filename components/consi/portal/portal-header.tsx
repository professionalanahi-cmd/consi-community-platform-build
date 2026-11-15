'use client'

import Link from 'next/link'
import { useApp } from '@/components/consi/app-provider'
import { LanguageSelector } from '@/components/consi/language-selector'
import { Orb } from '@/components/consi/orb'

export function PortalHeader() {
  const { t } = useApp()
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 md:px-8">
        <Link href="/portal" className="flex items-center gap-2 font-heading text-xl font-bold">
          <Orb size={36} />
          {t('portal.title')}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/" className="min-h-11 content-center rounded-full px-4 text-base font-medium ring-1 ring-border hover:bg-muted">
            {t('portal.residentApp')}
          </Link>
          <LanguageSelector />
        </div>
      </div>
    </header>
  )
}
