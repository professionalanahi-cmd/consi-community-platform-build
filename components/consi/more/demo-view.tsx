'use client'

import Link from 'next/link'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'

export function DemoView() {
  const { t } = useApp()
  // Only the chapters the recorded video actually shows.
  const steps = [t('demo.c1'), t('demo.c2'), t('demo.c3')]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('more.demo')} backHref="/more">
        <p className="text-base leading-relaxed text-muted-foreground">{t('more.demoDesc')}</p>
      </PageHeader>

      <figure className="flex flex-col gap-3">
        {/* Screen recording of the real app, with burned-in English captions. No sound. */}
        <video
          controls
          playsInline
          muted
          preload="metadata"
          poster="/demo/consi-demo-poster.jpg"
          aria-label={t('more.demo')}
          className="aspect-video w-full rounded-[1.75rem] bg-foreground shadow-sm"
        >
          <source src="/demo/consi-demo.mp4" type="video/mp4" />
        </video>
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

      <Link href="/" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
        {t('demo.tryIt')}
      </Link>
    </div>
  )
}
