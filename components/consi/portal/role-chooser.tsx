'use client'

import { Building2, ShieldCheck } from 'lucide-react'
import { SelectField } from '../select-field'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Provider } from '@/lib/types'
import { useApp } from '../app-provider'

export function RoleChooser({ providers }: { providers: Pick<Provider, 'id' | 'name' | 'status'>[] }) {
  const router = useRouter()
  const { t } = useApp()
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [error, setError] = useState('')
  const [org, setOrg] = useState({ name: '', contactEmail: '', website: '' })
  const [registering, setRegistering] = useState(false)

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRegistering(true)
    const res = await fetch('/api/provider/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(org) })
    setRegistering(false)
    if (!res.ok) return setError((await res.json()).error ?? 'Could not register the organization')
    router.push('/portal/provider')
  }

  const enter = async (role: 'provider' | 'admin') => {
    setError('')
    const res = await fetch('/api/demo-role', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, providerId }) })
    if (!res.ok) return setError((await res.json()).error ?? t('portal.roles.error'))
    router.push(role === 'admin' ? '/portal/admin' : '/portal/provider')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{t('portal.roles.title')}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{t('portal.roles.intro')}</p>
      </div>
      <form onSubmit={register} className="flex flex-col gap-4 rounded-[1.75rem] bg-accent p-6 text-accent-foreground">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-semibold">List your organization&apos;s programs</h2>
          <p className="text-base leading-relaxed">
            Add your organization, then post a program by uploading a flyer or filling in a short form. Residents can find it right away, in English, Spanish, Armenian and Mandarin.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold">Organization name</span>
            <input required minLength={2} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} placeholder="Glendale Neighbors Pantry" className="h-12 rounded-2xl bg-card px-4 text-base text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold">Contact email (optional)</span>
            <input type="email" value={org.contactEmail} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })} placeholder="hello@example.org" className="h-12 rounded-2xl bg-card px-4 text-base text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold">Website (optional)</span>
            <input type="url" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} placeholder="https://example.org" className="h-12 rounded-2xl bg-card px-4 text-base text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        </div>
        <button type="submit" disabled={registering} className="min-h-12 w-fit rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground disabled:opacity-70">
          {registering ? 'Setting up…' : 'Add my organization'}
        </button>
      </form>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
          <Building2 className="size-8 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold">{t('portal.roles.providerTitle')}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{t('portal.roles.providerBody')}</p>
          <SelectField
            label={t('portal.organization')}
            value={providerId}
            onChange={setProviderId}
            options={providers.map((p) => ({ value: p.id, label: `${p.name} (${t(`portal.pstatus.${p.status}`)})` }))}
          />
          <button type="button" onClick={() => enter('provider')} className="mt-auto min-h-12 rounded-full bg-primary px-5 text-lg font-semibold text-primary-foreground">
            {t('portal.roles.enterProvider')}
          </button>
        </section>
        <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
          <ShieldCheck className="size-8 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold">{t('portal.roles.adminTitle')}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{t('portal.roles.adminBody')}</p>
          <button type="button" onClick={() => enter('admin')} className="mt-auto min-h-12 rounded-full bg-primary px-5 text-lg font-semibold text-primary-foreground">
            {t('portal.roles.enterAdmin')}
          </button>
        </section>
      </div>
      <p role="alert" className="text-base font-medium text-destructive">
        {error}
      </p>
    </div>
  )
}
