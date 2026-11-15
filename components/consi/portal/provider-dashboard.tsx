'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { LANGUAGE_META } from '@/lib/i18n'
import type { Lang, Provider, Resource } from '@/lib/types'
import { useApp } from '../app-provider'
import { FlyerUpload } from './flyer-upload'
import { EMPTY_DRAFT, ListingForm, type ListingDraft } from './listing-form'
import { StatusPill } from './status-pill'

type Listing = Resource & { stats: { impressions: number; views: number; referrals: number }; reviews: { id: string; action: string; note?: string; at: string }[] }

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error ?? 'Error')
  return d
}

export function ProviderDashboard() {
  const { t } = useApp()
  const { data, error, mutate } = useSWR<{ provider: Provider; listings: Listing[] }>('/api/provider/listings', fetcher)
  const [draft, setDraft] = useState<ListingDraft | null>(null)

  if (error) return <NeedRole />
  if (!data) return <p className="text-lg text-muted-foreground">{t('common.loading')}</p>

  const act = async (id: string, action: string) => {
    await fetch(`/api/provider/listings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
    mutate()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/portal" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full pr-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t('portal.backToRoles')}
        </Link>
        <p className="text-base font-medium text-muted-foreground">{t('portal.provider.dashboard')}</p>
        <h1 className="font-heading text-4xl font-bold text-balance">{data.provider.name}</h1>
        <p className="text-base">
          {t('portal.provider.orgStatus')}: <strong>{t(`portal.pstatus.${data.provider.status}`)}</strong>
          {data.provider.status === 'pending' && ` — ${t('portal.provider.pendingNote')}`}
        </p>
      </div>

      {draft ? (
        <ListingForm
          initial={{ ...draft, organization: draft.organization || data.provider.name }}
          onCancel={() => setDraft(null)}
          onDone={() => {
            setDraft(null)
            mutate()
          }}
        />
      ) : (
        <FlyerUpload onExtracted={setDraft} onManual={() => setDraft({ ...EMPTY_DRAFT, organization: data.provider.name })} />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-semibold">{t('portal.provider.yourListings')}</h2>
        {data.listings.length === 0 && <p className="text-base text-muted-foreground">{t('portal.provider.noListings')}</p>}
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.listings.map((l) => {
            const lastNote = l.reviews.find((r) => r.note)
            const translated = Object.keys(l.translations).map((code) => LANGUAGE_META[code as Lang]?.native ?? code)
            return (
              <li key={l.id} className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold">{l.name}</h3>
                  <StatusPill status={l.status} />
                </div>
                <p className="text-base leading-relaxed text-muted-foreground line-clamp-2">{l.summary}</p>
                <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-background p-3 text-center">
                  <Stat label={t('portal.stat.shown')} value={l.stats.impressions} />
                  <Stat label={t('portal.stat.opened')} value={l.stats.views} />
                  <Stat label={t('portal.stat.contacted')} value={l.stats.referrals} />
                </dl>
                <p className="text-sm text-muted-foreground">
                  {t('portal.provider.translations', { list: translated.length ? translated.join(', ') : t('portal.provider.translationsPending') })}
                </p>
                {lastNote && (
                  <p className="rounded-2xl bg-accent p-3 text-base text-accent-foreground">
                    <strong>{t('portal.provider.reviewerNote')}:</strong> {lastNote.note}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(l.status === 'draft' || l.status === 'rejected') && <Act onClick={() => act(l.id, 'submit')}>{t('portal.act.submit')}</Act>}
                  {l.status === 'published' && <Act onClick={() => act(l.id, 'pause')}>{t('portal.act.pause')}</Act>}
                  {l.status === 'paused' && <Act onClick={() => act(l.id, 'resume')}>{t('portal.act.resume')}</Act>}
                  {l.status !== 'removed' && <Act onClick={() => act(l.id, 'withdraw')}>{t('portal.act.withdraw')}</Act>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-heading text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function Act({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-full px-4 text-base font-medium ring-1 ring-border hover:bg-muted">
      {children}
    </button>
  )
}

export function NeedRole() {
  const { t } = useApp()
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-lg">{t('portal.needRole')}</p>
      <Link href="/portal" className="min-h-12 content-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
        {t('portal.chooseRole')}
      </Link>
    </div>
  )
}
