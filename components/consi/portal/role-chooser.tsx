'use client'

import { Building2, ShieldCheck } from 'lucide-react'
import { Pills } from '../pills'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RoleChooser({ providers }: { providers: { id: string; name: string; status: string }[] }) {
  const router = useRouter()
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [error, setError] = useState('')

  const enter = async (role: 'provider' | 'admin') => {
    setError('')
    const res = await fetch('/api/demo-role', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, providerId }) })
    if (!res.ok) return setError((await res.json()).error ?? 'Could not switch role')
    router.push(role === 'admin' ? '/portal/admin' : '/portal/provider')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-heading text-4xl font-bold text-balance">Staff and provider tools</h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          This is a demo: pick a role to explore. Real deployments should replace this with proper sign-in (for example Supabase Auth with a roles table). Nothing a provider submits reaches residents until an admin approves it.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
          <Building2 className="size-8 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold">Program provider</h2>
          <p className="text-base leading-relaxed text-muted-foreground">Upload flyers, review what CONSI extracted, submit listings, and see how residents find you.</p>
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">Organization</span>
            <Pills label="Organization" value={providerId} onChange={setProviderId} options={providers.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))} className="flex-col [&>button]:w-full [&>button]:rounded-2xl [&>button]:py-2 [&>button]:text-left" />
          </div>
          <button type="button" onClick={() => enter('provider')} className="mt-auto min-h-12 rounded-full bg-primary px-5 text-lg font-semibold text-primary-foreground">
            Enter as provider
          </button>
        </section>
        <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
          <ShieldCheck className="size-8 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-heading text-2xl font-semibold">CONSI admin</h2>
          <p className="text-base leading-relaxed text-muted-foreground">Review the approval queue, verify listings and providers, and see where community needs are going unmet.</p>
          <button type="button" onClick={() => enter('admin')} className="mt-auto min-h-12 rounded-full bg-primary px-5 text-lg font-semibold text-primary-foreground">
            Enter as admin
          </button>
        </section>
      </div>
      <p role="alert" className="text-base font-medium text-destructive">
        {error}
      </p>
    </div>
  )
}
