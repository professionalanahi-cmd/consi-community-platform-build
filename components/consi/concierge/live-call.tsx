'use client'

import { ConversationProvider, useConversation, useConversationClientTool } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { LANGUAGE_META } from '@/lib/i18n'
import { useApp } from '../app-provider'
import { CallShell, type ChatLine } from './call-shell'

type Session = { signedUrl?: string; agentId?: string }

export function LiveCall(props: { session: Session; onEnd: () => void; onSeeResults: (q: string) => void; onShowMe: (target: string) => void }) {
  return (
    <ConversationProvider>
      <LiveCallInner {...props} />
    </ConversationProvider>
  )
}

function LiveCallInner({ session, onEnd, onSeeResults, onShowMe }: { session: Session; onEnd: () => void; onSeeResults: (q: string) => void; onShowMe: (target: string) => void }) {
  const { t, lang, prefs, location } = useApp()
  const [lines, setLines] = useState<ChatLine[]>([])
  const [voiceOn, setVoiceOn] = useState(prefs.voiceEnabled)
  const [failed, setFailed] = useState(false)

  const convo = useConversation({
    volume: voiceOn ? 1 : 0,
    onMessage: (m: { message: string; source?: string; role?: string }) => {
      const role = m.source === 'user' || m.role === 'user' ? 'user' : 'assistant'
      setLines((l) => [...l, { id: crypto.randomUUID(), role, text: m.message }])
    },
    onError: () => setFailed(true),
  })

  useConversationClientTool('show_results', (params: Record<string, unknown>) => {
    const query = String(params.query ?? '')
    setLines((l) => {
      const last = l.at(-1)
      if (!last || last.role !== 'assistant') return l
      return [...l.slice(0, -1), { ...last, search: { query } }]
    })
    return 'Shown a "See these results" button.'
  })
  useConversationClientTool('highlight_control', (params: Record<string, unknown>) => {
    const target = String(params.target ?? '')
    onShowMe(target)
    return `Highlighted ${target}`
  })

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const base = session.signedUrl ? { signedUrl: session.signedUrl } : { agentId: session.agentId!, connectionType: 'webrtc' as const }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() =>
        convo.startSession({
          ...base,
          overrides: { agent: { language: LANGUAGE_META[lang].htmlLang.slice(0, 2) } },
          dynamicVariables: { zip: location?.zip ?? '', language: LANGUAGE_META[lang].english },
        } as Parameters<typeof convo.startSession>[0]),
      )
      .catch(() => setFailed(true))
    return () => convo.endSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connected = convo.status === 'connected'
  const status = failed ? t('cc.micDenied') : !connected ? t('cc.connecting') : convo.isMuted ? t('cc.idle') : convo.isSpeaking ? t('cc.speaking') : t('cc.listening')

  return (
    <CallShell
      title={t('cc.title')}
      connectionLabel={connected ? t('cc.connected') : t('cc.connecting')}
      orbState={!connected ? 'thinking' : convo.isSpeaking ? 'speaking' : convo.isMuted ? 'idle' : 'listening'}
      statusLabel={status}
      lines={lines}
      micOn={connected && !convo.isMuted}
      onToggleMic={() => convo.setMuted(!convo.isMuted)}
      voiceOn={voiceOn}
      onToggleVoice={() => setVoiceOn(!voiceOn)}
      onSend={(text) => {
        setLines((l) => [...l, { id: crypto.randomUUID(), role: 'user', text }])
        convo.sendUserMessage(text)
      }}
      onEnd={() => {
        convo.endSession()
        onEnd()
      }}
      onSeeResults={onSeeResults}
      onShowMe={onShowMe}
    />
  )
}
