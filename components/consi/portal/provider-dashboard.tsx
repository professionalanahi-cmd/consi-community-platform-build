'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'
import type { Provider, Resource } from '@/lib/types'
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
  const { data, error, mutate } = useSWR<{ provider: Provider; listings: Listing[] }>('/api/provider/listings', fetcher)
  const [draft, setDraft] = useState<ListingDraft | null>(null)

  if (error) return <NeedRole />
  if (!data) return <p className="text-lg text-muted-foreground">Loading…</p>

  const act = async (id: string, action: string) => {
    await fetch(`/api/provider/listings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
    mutate()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-base font-medium text-muted-foreground">Provider dashboard</p>
        <h1 className="font-heading text-4xl font-bold text-balance">{data.provider.name}</h1>
        <p className="text-base">
          Organization status: <strong className="capitalize">{data.provider.status}</strong>
          {data.provider.status === 'pending' && ' — listings can be submitted, and admins verify your organization during review.'}
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
        <h2 className="font-heading text-2xl font-semibold">Your listings</h2>
        {data.listings.length === 0 && <p className="text-base text-muted-foreground">No listings yet.</p>}
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.listings.map((l) => {
            const lastNote = l.reviews.find((r) => r.note)
            return (
              <li key={l.id} className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold">{l.name}</h3>
                  <StatusPill status={l.status} />
                </div>
                <p className="text-base leading-relaxed text-muted-foreground line-clamp-2">{l.summary}</p>
                <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-background p-3 text-center">
                  <Stat label="Shown" value={l.stats.impressions} />
                  <Stat label="Opened" value={l.stats.views} />
                  <Stat label="Contacted" value={l.stats.referrals} />
                </dl>
                <p className="text-sm text-muted-foreground">
                  Translations: {Object.keys(l.translations).length ? Object.keys(l.translations).join(', ') : 'generated after approval'}
                </p>
                {lastNote && (
                  <p className="rounded-2xl bg-accent p-3 text-base text-accent-foreground">
                    <strong>Reviewer note:</strong> {lastNote.note}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(l.status === 'draft' || l.status === 'rejected') && <Act onClick={() => act(l.id, 'submit')}>Submit for review</Act>}
                  {l.status === 'published' && <Act onClick={() => act(l.id, 'pause')}>Pause</Act>}
                  {l.status === 'paused' && <Act onClick={() => act(l.id, 'resume')}>Resume</Act>}
                  {l.status !== 'removed' && <Act onClick={() => act(l.id, 'withdraw')}>Withdraw</Act>}
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
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-lg">You need to choose a role first.</p>
      <Link href="/portal" className="min-h-12 content-center rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
        Choose a role
      </Link>
    </div>
  )
}
