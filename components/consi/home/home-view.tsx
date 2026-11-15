'use client'

import { useMemo } from 'react'
import { AudioLines } from 'lucide-react'
import { useApp } from '../app-provider'
import { LanguageSelector } from '../language-selector'
import { Orb } from '../orb'
import { LocationPicker } from './location-picker'
import { QuickStarts } from './quick-starts'
import { useRotatingWord } from '@/hooks/use-rotating-word'
import { cn } from '@/lib/utils'
import { SearchBox } from './search-box'

export function HomeView() {
  const { t, setConciergeOpen } = useApp()
  const wordList = t('home.promptWords')
  const words = useMemo(() => wordList.split('|'), [wordList])
  const { word, motionClass } = useRotatingWord(words)
  return (
    <div className="flex flex-col gap-8 md:grid md:grid-cols-2 xl:items-start xl:gap-x-12">
      <div className="-mb-4 flex justify-end md:col-span-2">
        <LanguageSelector />
      </div>

      {/* One stacked column on phones, a shared grid on tablets, and two side-by-side columns on wide screens. */}
      <div className="contents xl:flex xl:flex-col xl:gap-8">
        <header className="flex flex-col items-center gap-4 text-center md:col-span-2">
          <Orb size={112} />
          <div className="flex flex-col gap-2">
            <p className="text-lg font-medium text-muted-foreground">{t('home.greeting')}</p>
            <h1 aria-label={t('home.prompt')} className="font-heading text-3xl font-semibold leading-tight text-balance md:text-4xl md:leading-tight">
              {t('home.promptBefore')}{' '}
              <span data-hero-word className={cn('inline-block text-accent-foreground motion-reduce:transition-none', motionClass)}>
                {word}
              </span>{' '}
              {t('home.promptAfter')}
            </h1>
          </div>
        </header>

        <div className="md:col-span-2">
          <SearchBox />
        </div>

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
      </div>

      <div className="contents xl:flex xl:flex-col xl:gap-8">
        <LocationPicker />
        <div className="md:col-span-2">
          <QuickStarts />
        </div>
      </div>
    </div>
  )
}
