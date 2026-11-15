'use client'

import { ArrowUp, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'
import { Orb, type OrbState } from '../orb'

export interface ChatLine {
  id: string
  role: 'user' | 'assistant'
  text: string
  search?: { query: string } | null
  guide?: string | null
}

export function CallShell({
  title,
  connectionLabel,
  orbState,
  statusLabel,
  lines,
  micOn,
  onToggleMic,
  voiceOn,
  onToggleVoice,
  onSend,
  onEnd,
  onSeeResults,
  onShowMe,
  note,
}: {
  title: string
  connectionLabel: string
  orbState: OrbState
  statusLabel: string
  lines: ChatLine[]
  micOn: boolean
  onToggleMic: () => void
  voiceOn: boolean
  onToggleVoice: () => void
  onSend: (text: string) => void
  onEnd: () => void
  onSeeResults: (query: string) => void
  onShowMe: (target: string) => void
  note?: string
}) {
  const { t, prefs } = useApp()
  const [text, setText] = useState('')
  const [seconds, setSeconds] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: prefs.reducedMotion ? 'auto' : 'smooth', block: 'end' })
  }, [lines, prefs.reducedMotion])

  const send = () => {
    const v = text.trim()
    if (!v) return
    onSend(v)
    setText('')
  }
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    // The microphone is live during a call, so the controls stay silent rather than being picked up as speech.
    <div className="flex h-full flex-col" data-sound="none">
      <div className="flex flex-col items-center gap-1 px-5 pt-6 text-center">
        <p className="text-base font-semibold text-muted-foreground">{connectionLabel}</p>
        <h2 id="concierge-title" className="font-heading text-2xl font-bold">
          {title}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_70%)] opacity-70" />
          <Orb size={lines.length ? 120 : 180} state={orbState} className="relative" />
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums" aria-label={`${mm}:${ss}`}>{`${mm}:${ss}`}</p>
        <p aria-live="polite" className="text-base font-semibold text-muted-foreground">
          {statusLabel}
        </p>
        {note && <p className="max-w-sm px-5 text-center text-sm text-muted-foreground">{note}</p>}
      </div>

      {prefs.captions && (
        <div className="flex-1 overflow-y-auto px-5" aria-label={t('cc.transcript')} role="log">
          <ul className="flex flex-col gap-2 pb-2">
            {lines.map((l) => (
              <li key={l.id} className={cn('flex flex-col gap-2', l.role === 'user' ? 'items-end' : 'items-start')}>
                <p
                  className={cn(
                    'max-w-[85%] px-5 py-3 text-lg leading-relaxed',
                    l.role === 'user' ? 'rounded-[1.5rem] bg-primary text-primary-foreground' : 'rounded-[1.5rem] rounded-bl-md bg-card text-foreground shadow-sm',
                  )}
                >
                  {l.text}
                </p>
                {(l.search || l.guide) && (
                  <div className="flex flex-wrap gap-2">
                    {l.search && (
                      <button type="button" onClick={() => onSeeResults(l.search!.query)} className="min-h-11 rounded-full bg-accent px-4 text-base font-semibold text-accent-foreground">
                        {t('cc.seeResults')}
                      </button>
                    )}
                    {l.guide && (
                      <button type="button" onClick={() => onShowMe(l.guide!)} className="min-h-11 rounded-full bg-card px-4 text-base font-semibold ring-1 ring-border">
                        {t('cc.showMe')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div ref={endRef} />
        </div>
      )}
      {!prefs.captions && <div className="flex-1" />}

      <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-5 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring"
        >
          <label htmlFor="cc-text" className="sr-only">
            {t('cc.type')}
          </label>
          <input
            id="cc-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('cc.type')}
            className="h-11 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" disabled={!text.trim()} aria-label={t('cc.send')} className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30">
            <ArrowUp className="size-5" aria-hidden="true" />
          </button>
        </form>
        <div className="flex items-center justify-between">
          <RoundButton label={micOn ? t('cc.mute') : t('cc.mic')} pressed={micOn} onClick={onToggleMic}>
            {micOn ? <Mic className="size-7" aria-hidden="true" /> : <MicOff className="size-7" aria-hidden="true" />}
          </RoundButton>
          <RoundButton label={voiceOn ? t('cc.voiceOff') : t('cc.voiceOn')} pressed={voiceOn} onClick={onToggleVoice}>
            {voiceOn ? <Volume2 className="size-7" aria-hidden="true" /> : <VolumeX className="size-7" aria-hidden="true" />}
          </RoundButton>
          <RoundButton label={t('cc.end')} onClick={onEnd}>
            <X className="size-7" aria-hidden="true" />
          </RoundButton>
        </div>
      </div>
    </div>
  )
}

function RoundButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        aria-label={label}
        className={cn('flex size-20 items-center justify-center rounded-full shadow-sm transition-colors', pressed ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted')}
      >
        {children}
      </button>
      <span className="text-sm font-medium text-muted-foreground" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}
