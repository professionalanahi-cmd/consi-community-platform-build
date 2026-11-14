'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

function getRecognition(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Browser speech-to-text for dictating a search. */
export function useDictation(speechLang: string, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const rec = useRef<RecognitionLike | null>(null)
  const finalCb = useRef(onFinal)
  finalCb.current = onFinal

  useEffect(() => setSupported(Boolean(getRecognition())), [])

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getRecognition()
    if (!Ctor) {
      setSupported(false)
      return
    }
    setError(null)
    const r = new Ctor()
    r.lang = speechLang
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      let text = ''
      let final = false
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
        if (e.results[i].isFinal) final = true
      }
      setInterim(text)
      if (final) finalCb.current(text.trim())
    }
    r.onerror = (e) => setError(e.error)
    r.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.current = r
    r.start()
    setListening(true)
  }, [speechLang])

  useEffect(() => () => rec.current?.stop(), [])

  return { listening, interim, error, supported, start, stop }
}

/**
 * Text-to-speech used by the concierge and "read results aloud".
 * Tries ElevenLabs audio first (natural voice in English, Spanish, Armenian and Mandarin, via /api/voice/tts);
 * if that is unavailable it falls back to the browser's built-in voice.
 */
export function useSpeaker(speechLang: string, rate: number) {
  const [speaking, setSpeaking] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ticket = useRef(0)

  const browserSpeak = useCallback(
    (text: string, r: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = speechLang
      u.rate = r
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(speechLang.slice(0, 2).toLowerCase()))
      if (voice) u.voice = voice
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(u)
    },
    [speechLang],
  )

  const cancel = useCallback(() => {
    ticket.current++
    audio.current?.pause()
    audio.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, rateOverride?: number) => {
      if (typeof window === 'undefined' || !text.trim()) return
      cancel()
      const mine = ++ticket.current
      const r = rateOverride ?? rate
      setSpeaking(true)
      fetch('/api/voice/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang: speechLang.slice(0, 2).toLowerCase() }) })
        .then(async (res) => {
          if (mine !== ticket.current) return
          if (res.status !== 200 || !res.headers.get('content-type')?.startsWith('audio/')) throw new Error('no audio')
          const a = new Audio(URL.createObjectURL(await res.blob()))
          if (mine !== ticket.current) return
          a.playbackRate = Math.min(2, Math.max(0.5, r))
          a.onended = () => mine === ticket.current && setSpeaking(false)
          a.onerror = () => mine === ticket.current && setSpeaking(false)
          audio.current = a
          await a.play()
        })
        .catch(() => {
          if (mine !== ticket.current) return
          setSpeaking(false)
          browserSpeak(text, r)
        })
    },
    [speechLang, rate, cancel, browserSpeak],
  )

  useEffect(() => cancel, [cancel])

  return { speaking, speak, cancel }
}
