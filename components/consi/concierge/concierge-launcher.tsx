'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useApp } from '../app-provider'
import { Orb } from '../orb'
import { DemoCall } from './demo-call'
import { LiveCall } from './live-call'

type VoiceSession = { mode: 'demo'; reason?: string } | { mode: 'live'; signedUrl?: string; agentId?: string }

export function ConciergeLauncher() {
  const { t, conciergeOpen, setConciergeOpen, startSearch, setGuide } = useApp()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { data } = useSWR<VoiceSession>(conciergeOpen ? 'voice-session' : null, () => fetch('/api/voice/session').then((r) => r.json()), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (conciergeOpen && !d.open) d.showModal()
    if (!conciergeOpen && d.open) d.close()
  }, [conciergeOpen])

  const close = () => setConciergeOpen(false)
  const seeResults = (q: string) => {
    startSearch(q)
    close()
    router.push('/results')
  }
  const showMe = (target: string) => {
    close()
    const onResults = ['refine', 'view-toggle', 'save'].includes(target)
    const onSettings = ['language', 'text-size', 'voice-settings'].includes(target)
    if (onSettings) router.push('/settings')
    else if (!onResults) router.push('/')
    setTimeout(() => setGuide(target), 400)
  }

  return (
    <>
      {!conciergeOpen && (
        <button
          type="button"
          onClick={() => setConciergeOpen(true)}
          aria-label={t('home.talk')}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-2 pr-5 text-base font-semibold text-primary-foreground shadow-lg lg:right-[calc(50%-18rem)]"
        >
          <Orb size={40} />
          <span aria-hidden="true">CONSI</span>
        </button>
      )}
      <dialog
        ref={dialogRef}
        onClose={close}
        aria-labelledby="concierge-title"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-background p-0 text-foreground backdrop:bg-backdrop/80 sm:m-auto sm:h-[min(52rem,calc(100dvh-2rem))] sm:max-w-md sm:rounded-[2.5rem] sm:shadow-2xl"
      >
        {conciergeOpen &&
          (!data ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Orb size={140} state="thinking" />
              <p className="text-lg text-muted-foreground">{t('cc.connecting')}</p>
            </div>
          ) : data.mode === 'live' ? (
            <LiveCall session={data} onEnd={close} onSeeResults={seeResults} onShowMe={showMe} />
          ) : (
            <DemoCall reason={data.reason} onEnd={close} onSeeResults={seeResults} onShowMe={showMe} />
          ))}
      </dialog>
    </>
  )
}
