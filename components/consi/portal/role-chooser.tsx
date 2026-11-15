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

  const enter = async (role: 'provider' | 'admin') => {
    setError('')
    const res = await fetch('/api/demo-role', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, providerId }) })
    if (!res.ok) return setError((await res.json()).error ?? t('portal.roles.error'))
    router.push(role === 'admin' ? '/portal/admin' : '/portal/provider')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold text-balance">{t('portal.roles.title')}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{t('portal.roles.intro')}</p>
      </div>
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
