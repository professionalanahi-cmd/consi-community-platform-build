'use client'

import type { FollowUpQuestion } from '@/lib/types'
import { useApp } from '../app-provider'
import { Orb } from '../orb'

export function FollowUpCard({ q, onAnswer }: { q: FollowUpQuestion; onAnswer: (value: string) => void }) {
  const { t } = useApp()
  return (
    <section aria-labelledby="fu-q" className="flex flex-col gap-4 rounded-[1.75rem] bg-accent p-5 text-accent-foreground">
      <div className="flex items-start gap-3">
        <Orb size={44} />
        <div className="flex flex-col gap-1">
          <h2 id="fu-q" className="text-lg font-semibold leading-snug text-balance">
            {q.question}
          </h2>
          <p className="text-base leading-relaxed">
            <span className="font-semibold">{t('fu.why')} </span>
            {q.why}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <button key={o.value} type="button" onClick={() => onAnswer(o.value)} className="min-h-12 rounded-full bg-card px-5 text-base font-semibold text-foreground hover:bg-background">
            {o.label}
          </button>
        ))}
        <button type="button" onClick={() => onAnswer('skip')} className="min-h-12 rounded-full px-4 text-base font-semibold underline-offset-4 hover:underline">
          {t('fu.skip')}
        </button>
      </div>
    </section>
  )
}
