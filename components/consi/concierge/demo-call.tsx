'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDictation, useSpeaker } from '@/hooks/use-speech'
import { LANGUAGE_META } from '@/lib/i18n'
import { useApp } from '../app-provider'
import { CallShell, type ChatLine } from './call-shell'

export function DemoCall({ onEnd, onSeeResults, onShowMe, reason }: { onEnd: () => void; onSeeResults: (q: string) => void; onShowMe: (target: string) => void; reason?: string }) {
  const { t, lang, prefs, location, search } = useApp()
  const speech = LANGUAGE_META[lang].speech
  const [lines, setLines] = useState<ChatLine[]>(() => [{ id: 'hello', role: 'assistant', text: t('cc.hello') }])
  const [thinking, setThinking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(prefs.voiceEnabled)
  const linesRef = useRef(lines)
  linesRef.current = lines
  const { speaking, speak, cancel } = useSpeaker(speech, prefs.voiceSpeed)

  const send = useCallback(
    async (text: string) => {
      const next: ChatLine[] = [...linesRef.current, { id: crypto.randomUUID(), role: 'user', text }]
      setLines(next)
      setThinking(true)
      cancel()
      try {
        const res = await fetch('/api/concierge', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            lang,
            zip: location?.zip,
            // What the resident last searched, so follow-ups ("which is closest?") are answered about the results on screen.
            lastQuery: search?.query,
            messages: next.filter((l) => l.id !== 'hello').slice(-20).map((l) => ({ role: l.role, content: l.text })),
          }),
        })
        if (!res.ok) throw new Error('failed')
        const data = (await res.json()) as { reply: string; search: { query: string } | null; guide: string | null }
        setLines((l) => [...l, { id: crypto.randomUUID(), role: 'assistant', text: data.reply, search: data.search?.query ? { query: data.search.query } : null, guide: data.guide }])
        if (voiceOn) speak(data.reply)
      } catch {
        setLines((l) => [...l, { id: crypto.randomUUID(), role: 'assistant', text: t('common.error') }])
      } finally {
        setThinking(false)
      }
    },
    [cancel, lang, location?.zip, search?.query, speak, t, voiceOn],
  )

  const dictation = useDictation(speech, (finalText) => {
    if (finalText.trim()) send(finalText.trim())
  })

  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    if (prefs.voiceEnabled) speak(t('cc.hello'))
  }, [prefs.voiceEnabled, speak, t])

  useEffect(() => () => cancel(), [cancel])

  const orbState = dictation.listening ? 'listening' : thinking ? 'thinking' : speaking ? 'speaking' : 'idle'
  const status = dictation.listening
    ? dictation.interim || t('cc.listening')
    : thinking
      ? t('cc.thinking')
      : speaking
        ? t('cc.speaking')
        : dictation.error
          ? t('cc.micDenied')
          : t('cc.idle')

  return (
    <CallShell
      title={t('cc.title')}
      connectionLabel={t('cc.demoMode')}
      note={reason ?? t('cc.demoNote')}
      orbState={orbState}
      statusLabel={status}
      lines={lines}
      micOn={dictation.listening}
      onToggleMic={() => {
        if (dictation.listening) return dictation.stop()
        cancel()
        dictation.start()
      }}
      voiceOn={voiceOn}
      onToggleVoice={() => {
        if (voiceOn) cancel()
        setVoiceOn(!voiceOn)
      }}
      onSend={send}
      onEnd={onEnd}
      onSeeResults={onSeeResults}
      onShowMe={onShowMe}
    />
  )
}
