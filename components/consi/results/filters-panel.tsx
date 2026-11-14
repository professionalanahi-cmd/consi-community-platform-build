'use client'

import { useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { LANGUAGES, type SearchFilters } from '@/lib/types'
import { useApp } from '../app-provider'

const RADII = [1, 3, 5, 10, 25]

export function FiltersPanel({ onClose }: { onClose: () => void }) {
  const { t, search, updateSearch } = useApp()
  const [filters, setFilters] = useState<SearchFilters>(search?.filters ?? {})
  const [radius, setRadius] = useState(search?.radiusMiles ?? 5)

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))
  const selectCls = 'h-12 w-full rounded-full bg-background px-4 text-base ring-1 ring-input outline-none focus:ring-2 focus:ring-ring'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        updateSearch({ filters, radiusMiles: radius, page: 1 })
        onClose()
      }}
      className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 ring-1 ring-border"
      aria-label={t('results.refine')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="f-radius" label={t('filters.distance')}>
          <select id="f-radius" className={selectCls} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {t('filters.miles', { n: r })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-cost" label={t('filters.cost')}>
          <select id="f-cost" className={selectCls} value={filters.cost ?? 'any'} onChange={(e) => set('cost', e.target.value as SearchFilters['cost'])}>
            <option value="any">{t('filters.any')}</option>
            <option value="free">{t('cost.free')}</option>
            <option value="subsidized">{t('cost.subsidized')}</option>
            <option value="paid">{t('cost.paid')}</option>
          </select>
        </Field>
        <Field id="f-age" label={t('filters.age')}>
          <select id="f-age" className={selectCls} value={filters.ageGroup ?? 'any'} onChange={(e) => set('ageGroup', e.target.value as SearchFilters['ageGroup'])}>
            <option value="any">{t('filters.any')}</option>
            {(['child', 'teen', 'adult', 'senior'] as const).map((a) => (
              <option key={a} value={a}>
                {t(`age.${a}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="f-lang" label={t('filters.language')}>
          <select id="f-lang" className={selectCls} value={filters.language ?? 'any'} onChange={(e) => set('language', e.target.value as SearchFilters['language'])}>
            <option value="any">{t('filters.any')}</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_META[l].native}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t('results.refine')}</legend>
        <Check label={t('filters.openNow')} checked={filters.availability === 'open'} onChange={(v) => set('availability', v ? 'open' : 'any')} />
        <Check label={t('filters.accessible')} checked={!!filters.accessible} onChange={(v) => set('accessible', v)} />
        <Check label={t('filters.transit')} checked={!!filters.transit} onChange={(v) => set('transit', v)} />
        <Check label={t('filters.noRegistration')} checked={!!filters.noRegistration} onChange={(v) => set('noRegistration', v)} />
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className="min-h-12 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground">
          {t('filters.apply')}
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters({})
            setRadius(5)
          }}
          className="min-h-12 rounded-full px-5 text-base font-semibold ring-1 ring-border hover:bg-muted"
        >
          {t('filters.reset')}
        </button>
      </div>
    </form>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
      </label>
      {children}
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--mint)]" />
      {label}
    </label>
  )
}
