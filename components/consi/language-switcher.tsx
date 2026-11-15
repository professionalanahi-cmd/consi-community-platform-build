'use client'

import { Check, ChevronDown, Globe } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { LANGUAGES, type Lang } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useApp } from './app-provider'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, updatePrefs, t } = useApp()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    itemRefs.current[LANGUAGES.indexOf(lang)]?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, lang])

  const choose = (next: Lang) => {
    setOpen(false)
    buttonRef.current?.focus()
    if (next !== lang) updatePrefs({ language: next })
  }

  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t('settings.language')}: ${LANGUAGE_META[lang].native}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-3 text-base font-medium ring-1 ring-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span lang={LANGUAGE_META[lang].htmlLang} className="max-w-28 truncate">
          {LANGUAGE_META[lang].native}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('settings.language')}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col rounded-2xl bg-card p-1.5 shadow-lg ring-1 ring-border"
        >
          {LANGUAGES.map((l, i) => {
            const selected = l === lang
            return (
              <button
                key={l}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                lang={LANGUAGE_META[l].htmlLang}
                onClick={() => choose(l)}
                className={cn(
                  'flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-left text-base hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                  selected && 'font-semibold',
                )}
              >
                {LANGUAGE_META[l].native}
                {selected && <Check className="size-4 text-primary" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
