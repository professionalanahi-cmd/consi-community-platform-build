'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Provider, Resource } from '@/lib/types'
import { cn } from '@/lib/utils'
import { NeedRole } from './provider-dashboard'
import { StatusPill } from './status-pill'

type Stats = { impressions: number; views: number; referrals: number }
interface Overview {
  queue: Resource[]
  listings: (Resource & { stats: Stats })[]
  providers: Provider[]
  reviews: { id: string; resourceId: string; actor: string; action: string; note?: string; at: string }[]
  insights: {
    totalSearches: number
    demand: { category: string; searches: number; zeroResults: number }[]
    gaps: { zip: string; category: string; count: number }[]
    unconfirmedRules: [string, number][]
    lowPerforming: { id: string; name: string; impressions: number; views: number; viewRate: number }[]
    staleCount: number
    stale: { id: string; name: string; lastVerified: string | null }[]
  }
  integrations: Record<string, string>
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error ?? 'Error')
  return d
}

const TABS = ['Queue', 'Listings', 'Providers', 'Insights'] as const

export function AdminDashboard() {
  const { data, error, mutate } = useSWR<Overview>('/api/admin/overview', fetcher)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Queue')

  if (error) return <NeedRole />
  if (!data) return <p className="text-lg text-muted-foreground">Loading…</p>

  const act = async (id: string, action: string, note?: string) => {
    const res = await fetch(`/api/admin/listings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, note }) })
    if (!res.ok) alert((await res.json()).error)
    mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold">Admin</h1>
        <ul className="flex flex-wrap gap-2" aria-label="Integration status">
          {Object.entries(data.integrations).map(([k, v]) => (
            <li key={k} className="rounded-full bg-card px-3 py-1 text-sm ring-1 ring-border">
              <span className="font-semibold capitalize">{k}:</span> {v}
            </li>
          ))}
        </ul>
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('min-h-11 shrink-0 rounded-full px-5 text-base font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'bg-card ring-1 ring-border')}
          >
            {t}
            {t === 'Queue' && data.queue.length > 0 && ` (${data.queue.length})`}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'Queue' && <Queue items={data.queue} providers={data.providers} act={act} />}
        {tab === 'Listings' && <Listings items={data.listings} act={act} />}
        {tab === 'Providers' && <Providers items={data.providers} onChange={mutate} />}
        {tab === 'Insights' && <Insights data={data.insights} />}
      </div>
    </div>
  )
}

type Act = (id: string, action: string, note?: string) => Promise<void>

function Queue({ items, providers, act }: { items: Resource[]; providers: Provider[]; act: Act }) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  if (!items.length) return <p className="text-lg text-muted-foreground">The queue is empty.</p>
  return (
    <ul className="flex flex-col gap-4">
      {items.map((r) => {
        const p = providers.find((x) => x.id === r.providerId)
        return (
          <li key={r.id} className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">{r.name}</h2>
                <p className="text-base text-muted-foreground">
                  {r.organization}
                  {p && ` · provider ${p.status}`}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
            <p className="text-base leading-relaxed">{r.summary}</p>
            <dl className="grid gap-2 text-base sm:grid-cols-2">
              <Row k="Address" v={`${r.location.address}, ${r.location.city} ${r.location.zip}`} />
              <Row k="Cost" v={`${r.cost}${r.costDetail ? ` — ${r.costDetail}` : ''}`} />
              <Row k="Categories" v={r.categories.join(', ')} />
              <Row k="Languages" v={r.languages.join(', ')} />
              <Row k="Contact" v={[r.phone, r.email, r.website].filter(Boolean).join(' · ') || '—'} />
              <Row k="Dates" v={[r.startDate && `starts ${r.startDate}`, r.deadline && `deadline ${r.deadline}`].filter(Boolean).join(', ') || '—'} />
            </dl>
            {r.uncertainFields?.length ? (
              <p className="rounded-2xl bg-accent p-3 text-base text-accent-foreground">
                AI flagged as uncertain: <strong>{r.uncertainFields.join(', ')}</strong>
              </p>
            ) : null}
            {r.originalFlyer && (
              <details className="rounded-2xl bg-background p-3">
                <summary className="cursor-pointer text-base font-medium">Original flyer: {r.originalFlyer.name}</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{r.originalFlyer.text || 'No text captured.'}</pre>
              </details>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-base font-medium">Note to provider (required to reject)</span>
              <textarea rows={2} value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} className="rounded-2xl bg-background p-3 text-base ring-1 ring-border" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => act(r.id, 'approve_publish', notes[r.id])} className="min-h-12 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
                Approve and publish
              </button>
              {r.status === 'submitted' && <Btn onClick={() => act(r.id, 'start_review')}>Start review</Btn>}
              <Btn onClick={() => act(r.id, 'reject', notes[r.id])}>Send back</Btn>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Listings({ items, act }: { items: (Resource & { stats: Stats })[]; act: Act }) {
  return (
    <div className="overflow-x-auto rounded-[1.75rem] bg-card shadow-sm">
      <table className="w-full min-w-[720px] text-left text-base">
        <thead className="border-b border-border text-sm text-muted-foreground">
          <tr>
            <th className="p-4 font-medium">Listing</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Verification</th>
            <th className="p-4 font-medium">Shown / opened / contacted</th>
            <th className="p-4 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="p-4">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">
                  {r.organization}
                  {r.isSample && ' · sample'}
                </p>
              </td>
              <td className="p-4">
                <StatusPill status={r.status} />
              </td>
              <td className="p-4 capitalize">{r.verification.replace('_', ' ')}</td>
              <td className="p-4 tabular-nums">{`${r.stats.impressions} / ${r.stats.views} / ${r.stats.referrals}`}</td>
              <td className="p-4">
                <div className="flex flex-wrap justify-end gap-2">
                  {r.status === 'published' && <Btn onClick={() => act(r.id, 'pause')}>Pause</Btn>}
                  {r.status === 'paused' && <Btn onClick={() => act(r.id, 'unpause')}>Unpause</Btn>}
                  {r.verification !== 'verified' && <Btn onClick={() => act(r.id, 'mark_verified')}>Verify</Btn>}
                  {r.status !== 'suspended' && r.status !== 'removed' && <Btn onClick={() => act(r.id, 'suspend')}>Suspend</Btn>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Providers({ items, onChange }: { items: Provider[]; onChange: () => void }) {
  const set = async (id: string, status: Provider['status']) => {
    await fetch(`/api/admin/providers/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
    onChange()
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((p) => (
        <li key={p.id} className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{p.name}</h2>
          <p className="text-base text-muted-foreground">{p.contactEmail}</p>
          <p className="text-base">
            Status: <strong className="capitalize">{p.status}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {p.status !== 'verified' && <Btn onClick={() => set(p.id, 'verified')}>Verify</Btn>}
            {p.status !== 'suspended' && <Btn onClick={() => set(p.id, 'suspended')}>Suspend</Btn>}
            {p.status === 'suspended' && <Btn onClick={() => set(p.id, 'pending')}>Reinstate</Btn>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Insights({ data }: { data: Overview['insights'] }) {
  const max = Math.max(1, ...data.demand.map((d) => d.searches))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`What residents search for (${data.totalSearches} searches)`}>
        {data.demand.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.demand.map((d) => (
              <li key={d.category} className="flex flex-col gap-1">
                <div className="flex justify-between text-base">
                  <span className="capitalize">{d.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {d.searches}
                    {d.zeroResults > 0 && ` · ${d.zeroResults} with no results`}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted" aria-hidden="true">
                  <div className="h-3 rounded-full bg-mint-foreground" style={{ width: `${(d.searches / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Service gaps (few or no matches)">
        {data.gaps.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.gaps.map((g) => (
              <li key={`${g.zip}${g.category}`} className="flex justify-between py-2 text-base">
                <span>
                  <span className="capitalize">{g.category}</span> near {g.zip}
                </span>
                <span className="tabular-nums text-muted-foreground">{g.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Eligibility residents could not confirm">
        {data.unconfirmedRules.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.unconfirmedRules.map(([rule, n]) => (
              <li key={rule} className="flex justify-between py-2 text-base">
                <span>{rule}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={`Needs re-verification (${data.staleCount})`}>
        {data.stale.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.stale.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2 text-base">
                <span>{s.name}</span>
                <span className="shrink-0 text-muted-foreground">{s.lastVerified ? s.lastVerified.slice(0, 10) : 'never'}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Shown often, rarely opened">
        {data.lowPerforming.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.lowPerforming.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 py-2 text-base">
                <span>{l.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{`${l.views}/${l.impressions}`}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 shadow-sm">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="text-base text-muted-foreground">No data yet. Run a few resident searches.</p>
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="capitalize-first">{v}</dd>
    </div>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-full px-4 text-base font-medium ring-1 ring-border hover:bg-muted">
      {children}
    </button>
  )
}
