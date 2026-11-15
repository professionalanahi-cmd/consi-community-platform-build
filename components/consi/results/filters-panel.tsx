'use client'

import { useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { LANGUAGES, type SearchFilters } from '@/lib/types'
import { useApp } from '../app-provider'
import { SelectField } from '../select-field'

const RADII = [1, 3, 5, 10, 25]

export function FiltersPanel({ onClose }: { onClose: () => void }) {
  const { t, search, updateSearch } = useApp()
  const [filters, setFilters] = useState<SearchFilters>(search?.filters ?? {})
  const [radius, setRadius] = useState(search?.radiusMiles ?? 5)

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField label={t('filters.distance')} value={radius} onChange={setRadius} options={RADII.map((r) => ({ value: r, label: t('filters.miles', { n: r }) }))} />
        <SelectField
          label={t('filters.cost')}
          value={filters.cost ?? 'any'}
          onChange={(v) => set('cost', v)}
          options={[
            { value: 'any', label: t('filters.any') },
            { value: 'free', label: t('cost.free') },
            { value: 'subsidized', label: t('cost.subsidized') },
            { value: 'paid', label: t('cost.paid') },
          ]}
        />
        <SelectField
          label={t('filters.age')}
          value={filters.ageGroup ?? 'any'}
          onChange={(v) => set('ageGroup', v)}
          options={[{ value: 'any' as const, label: t('filters.any') }, ...(['child', 'teen', 'adult', 'senior'] as const).map((a) => ({ value: a, label: t(`age.${a}`) }))]}
        />
        <SelectField
          label={t('filters.language')}
          value={filters.language ?? 'any'}
          onChange={(v) => set('language', v)}
          options={[{ value: 'any' as const, label: t('filters.any') }, ...LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_META[l].native }))]}
        />
      </div>
      <fieldset className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
        <legend className="sr-only">{t('results.refine')}</legend>
        <Check label={t('filters.openNow')} checked={filters.availability === 'open'} onChange={(v) => set('availability', v ? 'open' : 'any')} />
        <Check label={t('filters.accessible')} checked={!!filters.accessible} onChange={(v) => set('accessible', v)} />
        <Check label={t('filters.transit')} checked={!!filters.transit} onChange={(v) => set('transit', v)} />
        <Check label={t('filters.noRegistration')} checked={!!filters.noRegistration} onChange={(v) => set('noRegistration', v)} />
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className="min-h-12 flex-1 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground md:flex-none md:px-10">
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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--mint)]" />
      {label}
    </label>
  )
}
