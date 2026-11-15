'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import useSWR from 'swr'
import { LANGUAGE_META, type DictKey } from '@/lib/i18n'
import { formatDate } from '@/lib/prefs'
import type { Category, Provider, Resource } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'
import { FIELD_LABELS } from './listing-form'
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
  integrations: Record<string, string | Record<string, unknown>>
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error ?? 'Error')
  return d
}

const TABS = ['queue', 'listings', 'providers', 'insights'] as const

const INTEGRATION_LABELS: Record<string, DictKey> = {
  ai: 'portal.int.ai',
  voice: 'portal.int.voice',
  gis: 'portal.int.gis',
  database: 'portal.int.database',
}

const INTEGRATION_VALUES: Record<string, DictKey> = {
  live: 'portal.int.live',
  demo: 'portal.int.demo',
  'demo (in-memory)': 'portal.int.demoMemory',
}

const RULE_LABELS: Record<string, DictKey> = {
  age: 'portal.rule.age',
  residency: 'portal.rule.residency',
  res: 'portal.rule.residency',
  income: 'portal.rule.income',
  other: 'portal.rule.other',
}

function useLabels() {
  const { t } = useApp()
  const lookup = (map: Record<string, DictKey>, value: string) => (map[value] ? t(map[value]) : value)
  const category = (value: string) => ((CATEGORIES as readonly string[]).includes(value) ? t(`cat.${value as Category}`) : value)
  return { lookup, category }
}

export function AdminDashboard() {
  const { t } = useApp()
  const { lookup } = useLabels()
  const { data, error, mutate } = useSWR<Overview>('/api/admin/overview', fetcher)
  const [tab, setTab] = useState<(typeof TABS)[number]>('queue')

  if (error) return <NeedRole />
  if (!data) return <p className="text-lg text-muted-foreground">{t('common.loading')}</p>

  const act = async (id: string, action: string, note?: string) => {
    const res = await fetch(`/api/admin/listings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, note }) })
    if (!res.ok) alert((await res.json()).error)
    mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/portal" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full pr-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t('portal.backToRoles')}
        </Link>
        <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{t('portal.admin.title')}</h1>
        <ul className="flex flex-wrap gap-2" aria-label={t('portal.admin.integrations')}>
          {Object.entries(data.integrations).map(([k, v]) => (
            <li key={k} className="rounded-full bg-card px-3 py-1 text-sm ring-1 ring-border">
              <span className="font-semibold">{lookup(INTEGRATION_LABELS, k)}:</span>{' '}
              {typeof v === 'string'
                ? lookup(INTEGRATION_VALUES, v)
                : Object.entries(v)
                    .map(([a, b]) => `${a} ${lookup(INTEGRATION_VALUES, String(b))}`)
                    .join(' · ')}
            </li>
          ))}
        </ul>
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('min-h-11 shrink-0 rounded-full px-5 text-base font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'bg-card ring-1 ring-border')}
          >
            {t(`portal.admin.tab.${id}`)}
            {id === 'queue' && data.queue.length > 0 && ` (${data.queue.length})`}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'queue' && <Queue items={data.queue} providers={data.providers} act={act} />}
        {tab === 'listings' && <Listings items={data.listings} act={act} />}
        {tab === 'providers' && <Providers items={data.providers} onChange={mutate} />}
        {tab === 'insights' && <Insights data={data.insights} />}
      </div>
    </div>
  )
}

type Act = (id: string, action: string, note?: string) => Promise<void>

function Queue({ items, providers, act }: { items: Resource[]; providers: Provider[]; act: Act }) {
  const { t, lang } = useApp()
  const { lookup, category } = useLabels()
  const [notes, setNotes] = useState<Record<string, string>>({})
  if (!items.length) return <p className="text-lg text-muted-foreground">{t('portal.admin.queueEmpty')}</p>
  return (
    <ul className="flex flex-col gap-4">
      {items.map((r) => {
        const p = providers.find((x) => x.id === r.providerId)
        const dates = [
          r.startDate && t('portal.admin.starts', { date: formatDate(r.startDate, lang) }),
          r.deadline && t('portal.admin.deadline', { date: formatDate(r.deadline, lang) }),
        ].filter(Boolean)
        return (
          <li key={r.id} className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-pretty sm:text-2xl">{r.name}</h2>
                <p className="text-base text-muted-foreground">
                  {r.organization}
                  {p && ` · ${t('portal.admin.providerIs', { status: t(`portal.pstatus.${p.status}`) })}`}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
            <p className="max-w-3xl text-base leading-relaxed">{r.summary}</p>
            <dl className="grid gap-x-6 gap-y-2 text-base sm:grid-cols-2 lg:grid-cols-3">
              <Row k={t('portal.admin.address')} v={`${r.location.address}, ${r.location.city} ${r.location.zip}`} />
              <Row k={t('portal.form.cost')} v={`${t(`cost.${r.cost}`)}${r.costDetail ? ` — ${r.costDetail}` : ''}`} />
              <Row k={t('portal.form.categories')} v={r.categories.map(category).join(', ')} />
              <Row k={t('portal.form.languages')} v={r.languages.map((l) => LANGUAGE_META[l]?.native ?? l).join(', ')} />
              <Row k={t('portal.admin.contact')} v={[r.phone, r.email, r.website].filter(Boolean).join(' · ') || '—'} />
              <Row k={t('portal.admin.dates')} v={dates.join(', ') || '—'} />
            </dl>
            {r.uncertainFields?.length ? (
              <p className="rounded-2xl bg-accent p-3 text-base text-accent-foreground">
                {t('portal.admin.uncertain')}: <strong>{r.uncertainFields.map((f) => lookup(FIELD_LABELS, f)).join(', ')}</strong>
              </p>
            ) : null}
            {r.originalFlyer && (
              <details className="rounded-2xl bg-background p-3">
                <summary className="cursor-pointer text-base font-medium">{t('portal.admin.flyer', { name: r.originalFlyer.name })}</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{r.originalFlyer.text || t('portal.admin.noFlyerText')}</pre>
              </details>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-base font-medium">{t('portal.admin.note')}</span>
              <textarea rows={2} value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} className="rounded-2xl bg-background p-3 text-base ring-1 ring-border" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => act(r.id, 'approve_publish', notes[r.id])} className="min-h-12 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground">
                {t('portal.act.approve')}
              </button>
              {r.status === 'submitted' && <Btn onClick={() => act(r.id, 'start_review')}>{t('portal.act.startReview')}</Btn>}
              <Btn onClick={() => act(r.id, 'reject', notes[r.id])}>{t('portal.act.sendBack')}</Btn>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Listings({ items, act }: { items: (Resource & { stats: Stats })[]; act: Act }) {
  const { t } = useApp()
  return (
    <>
    {/* Phones and tablets get one card per listing; the five-column table needs laptop width. */}
    <ul className="grid gap-4 md:grid-cols-2 lg:hidden">
      {items.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-pretty">{r.name}</h2>
              <p className="text-sm text-muted-foreground">
                {r.organization}
                {r.isSample && ` · ${t('portal.admin.sample')}`}
              </p>
            </div>
            <StatusPill status={r.status} />
          </div>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-background p-3 text-base">
            <div className="flex flex-col">
              <dt className="text-sm text-muted-foreground">{t('portal.admin.verification')}</dt>
              <dd>{t(`portal.verif.${r.verification}`)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-sm text-muted-foreground">{t('portal.admin.funnel')}</dt>
              <dd className="tabular-nums">{`${r.stats.impressions} / ${r.stats.views} / ${r.stats.referrals}`}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <ListingActions r={r} act={act} />
          </div>
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto rounded-[1.75rem] bg-card shadow-sm lg:block">
      <table className="w-full min-w-[720px] text-left text-base">
        <thead className="border-b border-border text-sm text-muted-foreground">
          <tr>
            <th className="p-4 font-medium">{t('portal.admin.listing')}</th>
            <th className="p-4 font-medium">{t('portal.statusLabel')}</th>
            <th className="p-4 font-medium">{t('portal.admin.verification')}</th>
            <th className="p-4 font-medium">{t('portal.admin.funnel')}</th>
            <th className="p-4 font-medium">
              <span className="sr-only">{t('portal.admin.actions')}</span>
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
                  {r.isSample && ` · ${t('portal.admin.sample')}`}
                </p>
              </td>
              <td className="p-4">
                <StatusPill status={r.status} />
              </td>
              <td className="p-4">{t(`portal.verif.${r.verification}`)}</td>
              <td className="p-4 tabular-nums">{`${r.stats.impressions} / ${r.stats.views} / ${r.stats.referrals}`}</td>
              <td className="p-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <ListingActions r={r} act={act} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}

function ListingActions({ r, act }: { r: Resource; act: Act }) {
  const { t } = useApp()
  return (
    <>
      {r.status === 'published' && <Btn onClick={() => act(r.id, 'pause')}>{t('portal.act.pause')}</Btn>}
      {r.status === 'paused' && <Btn onClick={() => act(r.id, 'unpause')}>{t('portal.act.unpause')}</Btn>}
      {r.verification !== 'verified' && <Btn onClick={() => act(r.id, 'mark_verified')}>{t('portal.act.verify')}</Btn>}
      {r.status !== 'suspended' && r.status !== 'removed' && <Btn onClick={() => act(r.id, 'suspend')}>{t('portal.act.suspend')}</Btn>}
    </>
  )
}

function Providers({ items, onChange }: { items: Provider[]; onChange: () => void }) {
  const { t } = useApp()
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
            {t('portal.statusLabel')}: <strong>{t(`portal.pstatus.${p.status}`)}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {p.status !== 'verified' && <Btn onClick={() => set(p.id, 'verified')}>{t('portal.act.verify')}</Btn>}
            {p.status !== 'suspended' && <Btn onClick={() => set(p.id, 'suspended')}>{t('portal.act.suspend')}</Btn>}
            {p.status === 'suspended' && <Btn onClick={() => set(p.id, 'pending')}>{t('portal.act.reinstate')}</Btn>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Insights({ data }: { data: Overview['insights'] }) {
  const { t, lang } = useApp()
  const { lookup, category } = useLabels()
  const max = Math.max(1, ...data.demand.map((d) => d.searches))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t('portal.insights.searches', { count: data.totalSearches })}>
        {data.demand.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.demand.map((d) => (
              <li key={d.category} className="flex flex-col gap-1">
                <div className="flex justify-between text-base">
                  <span>{category(d.category)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {d.searches}
                    {d.zeroResults > 0 && ` · ${t('portal.insights.noResults', { count: d.zeroResults })}`}
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
      <Panel title={t('portal.insights.gaps')}>
        {data.gaps.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.gaps.map((g) => (
              <li key={`${g.zip}${g.category}`} className="flex justify-between py-2 text-base">
                <span>
                  {/^\d/.test(g.zip)
                    ? t('portal.insights.gapNear', { category: category(g.category), zip: g.zip })
                    : t('portal.insights.gapUnknown', { category: category(g.category) })}
                </span>
                <span className="tabular-nums text-muted-foreground">{g.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('portal.insights.rules')}>
        {data.unconfirmedRules.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.unconfirmedRules.map(([rule, n]) => (
              <li key={rule} className="flex justify-between py-2 text-base">
                <span>{lookup(RULE_LABELS, rule)}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('portal.insights.stale', { count: data.staleCount })}>
        {data.stale.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.stale.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2 text-base">
                <span>{s.name}</span>
                <span className="shrink-0 text-muted-foreground">{s.lastVerified ? formatDate(s.lastVerified, lang) : t('portal.insights.never')}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('portal.insights.lowPerforming')}>
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
  const { t } = useApp()
  return <p className="text-base text-muted-foreground">{t('portal.insights.empty')}</p>
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
