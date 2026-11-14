'use client'

import { useMemo } from 'react'
import { AudioLines } from 'lucide-react'
import { useApp } from '../app-provider'
import { Orb } from '../orb'
import { LocationPicker } from './location-picker'
import { QuickStarts } from './quick-starts'
import { RotatingWord } from './rotating-word'
import { SearchBox } from './search-box'

export function HomeView() {
  const { t, setConciergeOpen } = useApp()
  const wordList = t('home.promptWords')
  const words = useMemo(() => wordList.split('|'), [wordList])
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-4 pt-4 text-center">
        <Orb size={112} />
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-muted-foreground">{t('home.greeting')}</p>
          <h1 className="font-heading text-3xl font-semibold leading-tight text-balance">
            <span className="sr-only">{t('home.prompt')}</span>
            <span aria-hidden="true">
              {t('home.promptBefore')}{' '}
              <RotatingWord words={words} className="text-accent-foreground" />{' '}
              {t('home.promptAfter')}
            </span>
          </h1>
        </div>
      </header>

      <SearchBox />

      <button
        type="button"
        onClick={() => setConciergeOpen(true)}
        data-guide="talk"
        className="flex min-h-16 items-center gap-4 rounded-3xl bg-accent px-5 py-3 text-left text-accent-foreground hover:bg-accent/80"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <AudioLines className="size-6" aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <span className="text-lg font-semibold">{t('home.talk')}</span>
          <span className="text-base leading-snug">{t('home.talkHint')}</span>
        </span>
      </button>

      <LocationPicker />
      <QuickStarts />
    </div>
  )
}
