'use client'

import { AlertTriangle } from 'lucide-react'
import { SelectField } from '../select-field'
import { useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { CATEGORIES, LANGUAGES } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ListingDraft {
  organization: string
  name: string
  summary: string
  categories: string[]
  cost: 'free' | 'subsidized' | 'paid'
  costDetail: string
  ageGroups: string[]
  eligibilityText: string
  address: string
  city: string
  zip: string
  phone: string
  email: string
  website: string
  languages: string[]
  availability: 'open' | 'waitlist' | 'seasonal' | 'closed'
  schedule: string
  deadline: string
  startDate: string
  registrationRequired: boolean
  transitNearby: boolean
  sourceLanguage: string
  originalFlyer?: { name: string; mediaType: string; text?: string }
  uncertainFields: string[]
}

export const EMPTY_DRAFT: ListingDraft = {
  organization: '',
  name: '',
  summary: '',
  categories: [],
  cost: 'free',
  costDetail: '',
  ageGroups: ['adult'],
  eligibilityText: '',
  address: '',
  city: '',
  zip: '',
  phone: '',
  email: '',
  website: '',
  languages: ['en'],
  availability: 'open',
  schedule: '',
  deadline: '',
  startDate: '',
  registrationRequired: false,
  transitNearby: false,
  sourceLanguage: 'en',
  uncertainFields: [],
}

const AGES = ['child', 'teen', 'adult', 'senior']
const input = 'min-h-12 w-full rounded-2xl bg-background px-4 text-base ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring'

export function ListingForm({ initial, onDone, onCancel }: { initial: ListingDraft; onDone: () => void; onCancel: () => void }) {
  const [d, setD] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => setD((p) => ({ ...p, [k]: v, uncertainFields: p.uncertainFields.filter((f) => f !== k) }))
  const flag = (k: string) => d.uncertainFields.includes(k)
  const toggle = (k: 'categories' | 'ageGroups' | 'languages', v: string) => set(k, d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v])

  const save = async (submit: boolean) => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/provider/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...d, phone: d.phone || undefined, costDetail: d.costDetail || undefined, schedule: d.schedule || undefined, submit }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? 'Please check the highlighted fields')
    onDone()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save(true)
      }}
      className="flex flex-col gap-6 rounded-[1.75rem] bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold">Review listing</h2>
        <p className="text-base text-muted-foreground">
          {d.uncertainFields.length
            ? `CONSI marked ${d.uncertainFields.length} field(s) as missing or unclear. Please confirm them before submitting.`
            : 'Confirm every detail. An admin reviews it before residents can see it.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field flagged={flag('organization')} label="Organization">
          <input required className={input} value={d.organization} onChange={(e) => set('organization', e.target.value)} />
        </Field>
        <Field flagged={flag('name')} label="Program name">
          <input required className={input} value={d.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field flagged={flag('summary')} label="Plain-language summary" wide>
          <textarea required minLength={10} rows={3} className={cn(input, 'py-3')} value={d.summary} onChange={(e) => set('summary', e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2 md:col-span-2">
          <legend className="mb-1 text-base font-medium">Categories {flag('categories') && '(check this)'}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} on={d.categories.includes(c)} onClick={() => toggle('categories', c)} label={c} />
            ))}
          </div>
        </fieldset>
        <Field flagged={flag('cost')} label="Cost">
          <SelectField
            label="Cost"
            hideLabel
            value={d.cost}
            onChange={(v) => set('cost', v)}
            options={[
              { value: 'free', label: 'Free' },
              { value: 'subsidized', label: 'Subsidized / sliding scale' },
              { value: 'paid', label: 'Paid' },
            ]}
          />
        </Field>
        <Field flagged={flag('costDetail')} label="Cost detail (optional)">
          <input className={input} value={d.costDetail} onChange={(e) => set('costDetail', e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">Ages served</legend>
          <div className="flex flex-wrap gap-2">
            {AGES.map((a) => (
              <Chip key={a} on={d.ageGroups.includes(a)} onClick={() => toggle('ageGroups', a)} label={a} />
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">Languages offered</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Chip key={l} on={d.languages.includes(l)} onClick={() => toggle('languages', l)} label={LANGUAGE_META[l].english} />
            ))}
          </div>
        </fieldset>
        <Field flagged={flag('eligibilityText')} label="Who qualifies" wide>
          <textarea rows={2} className={cn(input, 'py-3')} value={d.eligibilityText} onChange={(e) => set('eligibilityText', e.target.value)} />
        </Field>
        <Field flagged={flag('address')} label="Street address">
          <input required className={input} value={d.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field flagged={flag('city')} label="City">
            <input required className={input} value={d.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field flagged={flag('zip')} label="ZIP">
            <input required pattern="\d{5}" inputMode="numeric" className={input} value={d.zip} onChange={(e) => set('zip', e.target.value)} />
          </Field>
        </div>
        <Field flagged={flag('phone')} label="Phone">
          <input type="tel" className={input} value={d.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field flagged={flag('email')} label="Email">
          <input type="email" className={input} value={d.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field flagged={flag('website')} label="Website">
          <input type="url" placeholder="https://" className={input} value={d.website} onChange={(e) => set('website', e.target.value)} />
        </Field>
        <Field flagged={flag('schedule')} label="Schedule">
          <input className={input} placeholder="Tue & Thu, 5–7 PM" value={d.schedule} onChange={(e) => set('schedule', e.target.value)} />
        </Field>
        <Field flagged={flag('availability')} label="Availability">
          <SelectField
            label="Availability"
            hideLabel
            value={d.availability}
            onChange={(v) => set('availability', v)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'waitlist', label: 'Waitlist' },
              { value: 'seasonal', label: 'Seasonal' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field flagged={flag('startDate')} label="Start date">
            <input type="date" className={input} value={d.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field flagged={flag('deadline')} label="Deadline">
            <input type="date" className={input} value={d.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>
        <label className="flex min-h-12 items-center gap-3 text-base">
          <input type="checkbox" className="size-5 accent-primary" checked={d.registrationRequired} onChange={(e) => set('registrationRequired', e.target.checked)} />
          Registration required
        </label>
        <label className="flex min-h-12 items-center gap-3 text-base">
          <input type="checkbox" className="size-5 accent-primary" checked={d.transitNearby} onChange={(e) => set('transitNearby', e.target.checked)} />
          Near public transit
        </label>
      </div>
      <p role="alert" className="text-base font-medium text-destructive">
        {error}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="min-h-12 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground disabled:opacity-60">
          Submit for review
        </button>
        <button type="button" disabled={busy} onClick={() => save(false)} className="min-h-12 rounded-full px-6 text-lg font-semibold ring-1 ring-border hover:bg-muted">
          Save draft
        </button>
        <button type="button" onClick={onCancel} className="min-h-12 rounded-full px-6 text-lg text-muted-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ flagged, label, children, wide }: { flagged: boolean; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn('flex flex-col gap-1', wide && 'md:col-span-2')}>
      <span className="flex items-center gap-2 text-base font-medium">
        {label}
        {flagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 text-sm text-accent-foreground">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Check this
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn('min-h-11 rounded-full px-4 text-base capitalize ring-1', on ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background ring-border')}>
      {label}
    </button>
  )
}
