'use client'

import { ChevronDown, Globe } from 'lucide-react'
import { useId } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import type { Lang } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from './app-provider'

const HEADER_LANGUAGES: Lang[] = ['es', 'en', 'hy', 'zh']

export function LanguageSelector({ className }: { className?: string }) {
  const { t, lang, updatePrefs } = useApp()
  const id = useId()
  return (
    <div className={cn('relative shrink-0', className)}>
      <label htmlFor={id} className="sr-only">
        {t('settings.language')}
      </label>
      <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <select
        id={id}
        value={lang}
        onChange={(e) => updatePrefs({ language: e.target.value as Lang })}
        className="h-11 appearance-none rounded-full bg-card pl-11 pr-10 text-base font-medium outline-none ring-1 ring-border transition-shadow hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {HEADER_LANGUAGES.map((l) => (
          <option key={l} value={l} lang={LANGUAGE_META[l].htmlLang}>
            {LANGUAGE_META[l].native}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
