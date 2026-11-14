'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'

export function DemoView() {
  const { t } = useApp()
  const steps = [t('demo.c1'), t('demo.c2'), t('demo.c3'), t('demo.c4'), t('demo.c5')]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('more.demo')} backHref="/more">
        <p className="text-base leading-relaxed text-muted-foreground">{t('more.demoDesc')}</p>
      </PageHeader>

      <figure className="flex flex-col gap-3">
        <div
          role="img"
          aria-label={t('demo.placeholder')}
          className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] bg-foreground text-background shadow-sm"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-background/15" aria-hidden="true">
            <Play className="size-7 translate-x-0.5" />
          </span>
          <span className="font-heading text-xl font-semibold">{t('demo.placeholder')}</span>
        </div>
        <figcaption className="text-base leading-relaxed text-muted-foreground text-pretty">{t('demo.placeholderDesc')}</figcaption>
      </figure>

      <ol className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-lg leading-relaxed">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground" aria-hidden="true">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <p className="text-base leading-relaxed text-muted-foreground text-pretty">{t('demo.captions')}</p>

      <Link href="/" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
        {t('demo.tryIt')}
      </Link>
    </div>
  )
}
