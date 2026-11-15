'use client'

import Link from 'next/link'
import { useApp } from '@/components/consi/app-provider'
import { Brand } from '@/components/consi/brand'
import { LanguageSelector } from '@/components/consi/language-selector'

export function PortalHeader() {
  const { t } = useApp()
  return (
    <header className="border-b border-border bg-card md:sticky md:top-0 md:z-30">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2.5 md:px-8 lg:px-6 xl:px-7">
        <div className="flex min-w-0 items-center gap-2">
          <Brand href="/portal" />
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">{t('portal.badge')}</span>
        </div>
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
