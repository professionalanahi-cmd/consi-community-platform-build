'use client'

import { Bell, BellRing, Bookmark, BookmarkCheck, Check, ChevronDown, CircleHelp, Globe, Navigation, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { formatDate } from '@/lib/prefs'
import type { Recommendation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'
import { StatusBadge } from './status-badge'

function track(resourceId: string, type: 'view' | 'referral') {
  fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resourceId, type }), keepalive: true }).catch(() => {})
}

const ELIG_ICON = { met: Check, confirm: CircleHelp, not_met: X } as const
const ELIG_LABEL = { met: 'results.met', confirm: 'results.confirm', not_met: 'results.notMet' } as const

export function RecommendationCard({
  rec,
  index,
  saved,
  onToggleSave,
  reminded,
  onRemind,
}: {
  rec: Recommendation
  index: number
  saved: boolean
  onToggleSave: () => void
  reminded: boolean
  onRemind: () => void
}) {
  const { t, lang, prefs } = useApp()
  const [open, setOpen] = useState(false)
  const r = rec.resource
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.location.address}, ${r.location.city}, CA ${r.location.zip}`)}`
  const reminderDate = r.deadline ?? r.startDate
  const detailsId = `details-${r.id}`

  return (
    <article className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 shadow-sm ring-1 ring-border" aria-labelledby={`title-${r.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={rec.displayStatus} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {r.isSample && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{t('common.sampleData')}</span>}
          {rec.distanceMiles != null && <span>{t('results.miles', { n: rec.distanceMiles.toFixed(1) })}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 id={`title-${r.id}`} className="font-heading text-xl font-semibold leading-snug text-balance">
          <span className="sr-only">{`${index + 1}. `}</span>
          {rec.display.name}
        </h3>
        <p className="text-base text-muted-foreground">{r.organization}</p>
      </div>

      <p className="text-lg leading-relaxed text-pretty">{rec.display.summary}</p>

      {!prefs.simplified && rec.why.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-background p-4">
          <h4 className="text-base font-semibold">{t('results.why')}</h4>
          <ul className="flex flex-col gap-1.5">
            {rec.why.map((w) => (
              <li key={w} className="flex gap-2 text-base leading-relaxed">
                <Check className="mt-1 size-4 shrink-0 text-mint" aria-hidden="true" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rec.eligibility.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-base font-semibold">{t('results.eligibility')}</h4>
          <ul className="flex flex-col gap-1.5">
            {rec.eligibility.map((e) => {
              const Icon = ELIG_ICON[e.state]
              return (
                <li key={e.label} className="flex items-start gap-2 text-base leading-relaxed">
                  <Icon className={cn('mt-1 size-4 shrink-0', e.state === 'met' ? 'text-mint' : 'text-muted-foreground')} aria-hidden="true" />
                  <span>
                    {e.label} <span className="text-muted-foreground">{`(${t(ELIG_LABEL[e.state])})`}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {r.phone && (
          <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} onClick={() => track(r.id, 'referral')} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-base font-semibold text-primary-foreground">
            <Phone className="size-5" aria-hidden="true" />
            {t('results.call')}
          </a>
        )}
        <a href={dirUrl} target="_blank" rel="noopener noreferrer" onClick={() => track(r.id, 'referral')} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-4 text-base font-semibold ring-1 ring-border hover:bg-muted">
          <Navigation className="size-5" aria-hidden="true" />
          {t('results.directions')}
        </a>
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" onClick={() => track(r.id, 'referral')} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-4 text-base font-semibold ring-1 ring-border hover:bg-muted">
            <Globe className="size-5" aria-hidden="true" />
            {t('results.website')}
          </a>
        )}
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          data-guide={index === 0 ? 'save' : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-4 text-base font-semibold ring-1 ring-border hover:bg-muted"
        >
          {saved ? <BookmarkCheck className="size-5 text-mint" aria-hidden="true" /> : <Bookmark className="size-5" aria-hidden="true" />}
          {saved ? t('results.saved') : t('results.save')}
        </button>
        {reminderDate && (
          <button
            type="button"
            onClick={onRemind}
            disabled={reminded}
            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-4 text-base font-semibold text-accent-foreground disabled:opacity-70"
          >
            {reminded ? <BellRing className="size-5" aria-hidden="true" /> : <Bell className="size-5" aria-hidden="true" />}
            {reminded ? t('results.reminded') : t('results.remind')}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => {
          if (!open) track(r.id, 'view')
          setOpen(!open)
        }}
        className="flex min-h-11 items-center justify-center gap-2 text-base font-semibold text-mint"
      >
        {open ? t('results.hideDetails') : t('results.details')}
        <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <dl id={detailsId} className="grid gap-3 border-t border-border pt-4 text-base">
          <Detail label={t('results.cost')} value={`${t(`cost.${r.cost}`)}${r.costDetail ? ` — ${r.costDetail}` : ''}`} />
          {r.schedule && <Detail label={t('results.schedule')} value={r.schedule} />}
          {r.deadline && <Detail label={t('results.deadline')} value={formatDate(r.deadline, lang)} />}
          {r.startDate && <Detail label={t('results.starts')} value={formatDate(r.startDate, lang)} />}
          <Detail label={t('results.registration')} value={r.registrationRequired ? t('results.registration') : t('results.noRegistration')} />
          {r.availability === 'waitlist' && <Detail label={t('filters.availability')} value={t('results.waitlist')} />}
          <Detail label={t('results.languages')} value={r.languages.map((l) => LANGUAGE_META[l].native).join(', ')} />
          {r.accessibility.length > 0 && <Detail label={t('results.access')} value={r.accessibility.join(', ')} />}
          <Detail label="" value={`${r.location.address}, ${r.location.city} ${r.location.zip}`} />
          {r.lastVerified && <Detail label={t('results.lastChecked')} value={formatDate(r.lastVerified, lang)} />}
          <Detail label={t('results.source')} value={r.source} />
          {rec.display.translated && (
            <p className="rounded-2xl bg-background p-3 text-sm text-muted-foreground">
              {t('results.translated')} <span className="font-medium text-foreground">{`${t('results.original')}: ${r.name}`}</span>
            </p>
          )}
        </dl>
      )}
    </article>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      {label && <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>}
      <dd className="leading-relaxed">{value}</dd>
    </div>
  )
}
