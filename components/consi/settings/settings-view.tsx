'use client'

import { useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { LANGUAGES, type Preferences } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'
import { PageHeader } from '../page-header'
import { Segmented } from '../segmented'
import { SelectField } from '../select-field'

export function SettingsView() {
  const { t, prefs, updatePrefs, resetPrefs } = useApp()
  const [deleted, setDeleted] = useState(false)
  const set = (patch: Partial<Preferences>) => {
    setDeleted(false)
    updatePrefs(patch)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('settings.title')} backHref="/">
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">{t('settings.intro')}</p>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <div className="flex min-w-0 flex-col gap-6">
      <Section title={t('settings.language')} guide="language">
        <p className="text-base text-muted-foreground">{t('settings.languageHint')}</p>
        <Segmented
          label={t('settings.language')}
          value={prefs.language}
          onChange={(l) => set({ language: l })}
          options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_META[l].native, lang: LANGUAGE_META[l].htmlLang }))}
          className="!grid-cols-2 [&>button]:min-h-14 [&>button]:text-lg"
        />
      </Section>

      <Section title={t('settings.accessibility')} guide="text-size">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-lg font-semibold">{t('settings.textSize')}</legend>
          <Segmented
            label={t('settings.textSize')}
            value={prefs.textSize}
            onChange={(v) => set({ textSize: v })}
            options={(['normal', 'large', 'xlarge'] as const).map((v, i) => ({ value: v, label: t(`settings.${v}` as 'settings.normal'), style: { fontSize: `${1 + i * 0.15}rem` } }))}
            className="[&>button]:min-h-14"
          />
        </fieldset>
        <Toggle label={t('settings.highContrast')} checked={prefs.highContrast} onChange={(v) => set({ highContrast: v })} />
        <Toggle label={t('settings.reducedMotion')} checked={prefs.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
        <Toggle label={t('settings.simplified')} hint={t('settings.simplifiedHint')} checked={prefs.simplified} onChange={(v) => set({ simplified: v })} />
        <Toggle label={t('settings.captions')} checked={prefs.captions} onChange={(v) => set({ captions: v })} />
      </Section>

      <Section title={t('settings.voice')} guide="voice-settings">
        <Toggle label={t('settings.voiceEnabled')} checked={prefs.voiceEnabled} onChange={(v) => set({ voiceEnabled: v })} />
        <Toggle label={t('settings.autoRead')} checked={prefs.autoRead} onChange={(v) => set({ autoRead: v })} />
        <label className="flex flex-col gap-2">
          <span className="text-lg font-semibold">{t('settings.voiceSpeed')}</span>
          <input type="range" min={0.6} max={1.4} step={0.1} value={prefs.voiceSpeed} onChange={(e) => set({ voiceSpeed: Number(e.target.value) })} className="h-11 accent-primary" />
          <span className="flex justify-between text-sm text-muted-foreground" aria-hidden="true">
            <span>{t('settings.slow')}</span>
            <span>{t('settings.fast')}</span>
          </span>
        </label>
      </Section>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
      <Section title={t('settings.location')}>
        <Toggle label={t('settings.deviceLocation')} checked={prefs.useDeviceLocation} onChange={(v) => set({ useDeviceLocation: v })} />
        <SelectField label={t('settings.radius')} value={prefs.defaultRadius} onChange={(v) => set({ defaultRadius: v })} options={[2, 5, 10, 25].map((m) => ({ value: m, label: t('filters.miles', { n: m }) }))} className="[&>label]:text-lg" />
      </Section>

      <Section title={t('settings.privacy')}>
        <p className="text-base leading-relaxed text-muted-foreground">{t('settings.privacyNote')}</p>
        <Toggle label={t('settings.consentSave')} checked={prefs.consentSaveInfo} onChange={(v) => set({ consentSaveInfo: v })} />
        <Toggle label={t('settings.consentShare')} checked={prefs.consentShareWithProviders} onChange={(v) => set({ consentShareWithProviders: v })} />
      </Section>

      <Section title={t('settings.notifications')}>
        {(Object.keys(prefs.notify) as (keyof Preferences['notify'])[]).map((k) => (
          <Toggle key={k} label={NOTIFY_LABELS[k]} checked={prefs.notify[k]} onChange={(v) => set({ notify: { ...prefs.notify, [k]: v } })} />
        ))}
      </Section>

      <Section title={t('settings.account')}>
        <p className="text-base text-muted-foreground">{t('settings.guest')}</p>
        <button
          type="button"
          onClick={async () => {
            await resetPrefs()
            setDeleted(true)
          }}
          className="min-h-12 rounded-full bg-destructive px-5 text-lg font-semibold text-destructive-foreground"
        >
          {t('settings.deleteData')}
        </button>
        <p aria-live="polite" className="text-base font-medium">
          {deleted ? t('settings.deleted') : ''}
        </p>
      </Section>
      </div>
      </div>
    </div>
  )
}

const NOTIFY_LABELS: Record<keyof Preferences['notify'], string> = {
  newResources: 'New resources near me',
  registrationOpenings: 'Registration openings',
  deadlines: 'Upcoming deadlines',
  availabilityChanges: 'Availability changes',
  contactChanges: 'Contact info changes',
}

function Section({ title, guide, children }: { title: string; guide?: string; children: React.ReactNode }) {
  return (
    <section data-guide={guide} className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 shadow-sm">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-lg">{label}</span>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={cn('relative h-8 w-14 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring', checked ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('absolute top-1 size-6 rounded-full bg-card shadow transition-transform', checked ? 'translate-x-7' : 'translate-x-1')} />
      </span>
    </label>
  )
}
