'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useApp } from './app-provider'

export function PageHeader({ title, backHref, children }: { title: string; backHref?: string; children?: React.ReactNode }) {
  const { t } = useApp()
  return (
    <header className="mb-6 flex flex-col gap-3">
      {backHref && (
        <Link href={backHref} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full pr-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t('common.back')}
        </Link>
      )}
      <h1 className="font-heading text-3xl font-semibold text-balance md:text-4xl">{title}</h1>
      {children}
    </header>
  )
}
