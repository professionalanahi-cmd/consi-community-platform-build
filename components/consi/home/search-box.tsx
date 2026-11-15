'use client'

import { ArrowRight, Mic, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDictation } from '@/hooks/use-speech'
import { LANGUAGE_META } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'

export function SearchBox() {
  const { t, lang, startSearch } = useApp()
  const router = useRouter()
  const [text, setText] = useState('')

  const submit = (q: string) => {
    const query = q.trim()
    if (!query) return
    startSearch(query)
    router.push('/results')
  }

  const dictation = useDictation(LANGUAGE_META[lang].speech, (finalText) => {
    setText(finalText)
    submit(finalText)
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(text)
      }}
      className="flex flex-col gap-3"
      data-guide="search-box"
    >
      <label htmlFor="consi-search" className="sr-only">
        {t('home.searchLabel')}
      </label>
      <div className="flex items-end gap-2 rounded-[1.75rem] bg-card p-2 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
        <textarea
          id="consi-search"
          rows={2}
          value={dictation.listening ? dictation.interim || text : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit(text)
            }
          }}
          placeholder={t('home.searchPlaceholder')}
          className="field-sizing-content max-h-48 min-h-16 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-lg leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={dictation.listening ? dictation.stop : dictation.start}
          aria-pressed={dictation.listening}
          data-sound="none"
          aria-label={dictation.listening ? t('home.dictating') : t('home.dictate')}
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full transition-colors',
            dictation.listening ? 'bg-mint text-mint-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/80',
          )}
        >
          {dictation.listening ? <Square className="size-5" aria-hidden="true" /> : <Mic className="size-6" aria-hidden="true" />}
        </button>
      </div>
      <p aria-live="polite" className="min-h-0 text-base text-muted-foreground empty:hidden">
        {dictation.listening ? t('home.dictating') : !dictation.supported ? t('home.voiceUnsupported') : dictation.error ? t('cc.micDenied') : ''}
      </p>
      <button
        type="submit"
        disabled={!text.trim()}
        className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {t('home.search')}
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
    </form>
  )
}
