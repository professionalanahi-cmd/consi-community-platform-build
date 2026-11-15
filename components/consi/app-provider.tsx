'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { detectLanguage, LANGUAGE_META, translate, type DictKey } from '@/lib/i18n'
import { DEFAULT_PREFS } from '@/lib/prefs'
import type { Lang, Preferences, SearchAnswers, SearchFilters, SearchHistoryEntry, SearchResponse } from '@/lib/types'

export type LocationInput = { zip?: string; lat?: number; lng?: number; label?: string } | null

export interface SearchState {
  query: string
  answers: SearchAnswers
  filters: SearchFilters
  radiusMiles: number
  page: number
  /** Bumps to force a fresh search for the same query. */
  nonce: number
  /** History entry this search session writes to. */
  historyId: string
}

interface AppContextValue {
  prefs: Preferences
  updatePrefs: (patch: Partial<Preferences>) => void
  resetPrefs: () => Promise<void>
  lang: Lang
  t: (key: DictKey, vars?: Record<string, string | number>) => string
  location: LocationInput
  setLocation: (loc: LocationInput) => void
  search: SearchState | null
  startSearch: (query: string, extra?: Partial<SearchState>) => void
  updateSearch: (patch: Partial<SearchState>) => void
  /** False until the last active results have been restored from the server. */
  resultsReady: boolean
  /** Returns the stored snapshot once for a restored search so it is shown without searching again. */
  takeRestoredResults: (historyId: string) => SearchResponse | null
  clearResults: () => Promise<void>
  guide: string | null
  setGuide: (target: string | null) => void
  conciergeOpen: boolean
  setConciergeOpen: (open: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useSWR<{ prefs: Preferences; stored: boolean }>('/api/prefs', fetcher, { revalidateOnFocus: false })
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [detected, setDetected] = useState<Lang>('en')
  const [location, setLocationState] = useState<LocationInput>(null)
  const [search, setSearch] = useState<SearchState | null>(null)
  const [guide, setGuideState] = useState<string | null>(null)
  const [conciergeOpen, setConciergeOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrated = useRef(false)
  const { mutate: globalMutate } = useSWRConfig()
  const { data: activeData } = useSWR<{ entry: SearchHistoryEntry | null }>('/api/history/active', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })
  const [resultsReady, setResultsReady] = useState(false)
  const restoredResults = useRef<{ historyId: string; response: SearchResponse } | null>(null)
  const searchRef = useRef(search)
  searchRef.current = search

  useEffect(() => {
    if (!activeData || resultsReady) return
    const entry = activeData.entry
    if (entry && !searchRef.current) {
      restoredResults.current = { historyId: entry.id, response: entry.response }
      setSearch({ ...entry.criteria, page: entry.page, nonce: 0, historyId: entry.id })
      if (entry.criteria.location) setLocationState(entry.criteria.location)
    }
    setResultsReady(true)
  }, [activeData, resultsReady])

  const takeRestoredResults = useCallback((historyId: string) => {
    const snap = restoredResults.current
    if (!snap || snap.historyId !== historyId) return null
    restoredResults.current = null
    return snap.response
  }, [])

  const clearResults = useCallback(async () => {
    await fetch('/api/history/active', { method: 'DELETE' })
    restoredResults.current = null
    setSearch(null)
    globalMutate('/api/history/active', { entry: null }, { revalidate: false })
  }, [globalMutate])

  useEffect(() => {
    setDetected(detectLanguage(navigator.languages ?? [navigator.language]))
  }, [])

  useEffect(() => {
    if (data?.prefs && !hydrated.current) {
      hydrated.current = true
      setPrefs(data.prefs)
      const home = data.prefs.savedLocations.find((l) => l.label === 'home')
      if (home) setLocationState((cur) => cur ?? { zip: home.zip, label: home.zip })
    }
  }, [data])

  const lang = prefs.language ?? detected

  useEffect(() => {
    const root = document.documentElement
    root.lang = LANGUAGE_META[lang].htmlLang
    root.dataset.textSize = prefs.textSize
    root.dataset.contrast = prefs.highContrast ? 'high' : 'normal'
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'normal'
  }, [lang, prefs.textSize, prefs.highContrast, prefs.reducedMotion])

  const updatePrefs = useCallback(
    (patch: Partial<Preferences>) => {
      setPrefs((cur) => {
        const next = { ...cur, ...patch }
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          fetch('/api/prefs', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })
            .then((r) => r.json())
            .then((d) => mutate(d, { revalidate: false }))
            .catch(() => {})
        }, 400)
        return next
      })
    },
    [mutate],
  )

  const resetPrefs = useCallback(async () => {
    const res = await fetch('/api/prefs', { method: 'DELETE' })
    const d = await res.json()
    setPrefs(d.prefs)
    setLocationState(null)
    setSearch(null)
    await mutate(d, { revalidate: false })
  }, [mutate])

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  const startSearch = useCallback(
    (query: string, extra?: Partial<SearchState>) => {
      setSearch((cur) => ({
        query,
        answers: prefs.consentSaveInfo && cur ? cur.answers : {},
        filters: {},
        radiusMiles: prefs.defaultRadius,
        page: 1,
        nonce: (cur?.nonce ?? 0) + 1,
        ...extra,
        historyId: crypto.randomUUID(),
      }))
    },
    [prefs.consentSaveInfo, prefs.defaultRadius],
  )

  const updateSearch = useCallback((patch: Partial<SearchState>) => {
    setSearch((cur) => (cur ? { ...cur, ...patch } : cur))
  }, [])

  const setGuide = useCallback((target: string | null) => {
    if (guideTimer.current) clearTimeout(guideTimer.current)
    setGuideState(target)
    if (target) guideTimer.current = setTimeout(() => setGuideState(null), 7000)
  }, [])

  useEffect(() => {
    document.querySelectorAll('[data-guide-active="true"]').forEach((el) => el.removeAttribute('data-guide-active'))
    if (!guide) return
    const el = document.querySelector<HTMLElement>(`[data-guide="${guide}"]`)
    if (el) {
      el.setAttribute('data-guide-active', 'true')
      el.scrollIntoView({ behavior: prefs.reducedMotion ? 'auto' : 'smooth', block: 'center' })
    }
  }, [guide, prefs.reducedMotion])

  const value = useMemo<AppContextValue>(
    () => ({
      prefs,
      updatePrefs,
      resetPrefs,
      lang,
      t,
      location,
      setLocation: setLocationState,
      search,
      startSearch,
      updateSearch,
      resultsReady,
      takeRestoredResults,
      clearResults,
      guide,
      setGuide,
      conciergeOpen,
      setConciergeOpen,
    }),
    [prefs, updatePrefs, resetPrefs, lang, t, location, search, startSearch, updateSearch, resultsReady, takeRestoredResults, clearResults, guide, setGuide, conciergeOpen],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
