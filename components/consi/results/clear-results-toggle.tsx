'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '../app-provider'

export function ClearResultsToggle({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const { t } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const switchRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirming) keepRef.current?.focus()
  }, [confirming])

  const cancel = () => {
    setConfirming(false)
    switchRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span id="clear-results-label" className="text-base font-medium text-muted-foreground">
            {t('results.clear')}
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">{t('results.clearHint')}</span>
        </div>
        <button
          ref={switchRef}
          type="button"
          role="switch"
          aria-checked={confirming}
          aria-labelledby="clear-results-label"
          aria-controls="clear-results-confirm"
          onClick={() => (confirming ? cancel() : setConfirming(true))}
          className={cn(
            'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors motion-reduce:transition-none',
            confirming ? 'bg-primary' : 'bg-muted ring-1 ring-border',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-6 rounded-full bg-card shadow-sm transition-transform motion-reduce:transition-none',
              confirming ? 'translate-x-6' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {confirming && (
        <div
          id="clear-results-confirm"
          role="alertdialog"
          aria-labelledby="clear-results-confirm-title"
          aria-describedby="clear-results-confirm-body"
          onKeyDown={(e) => e.key === 'Escape' && cancel()}
          className="flex flex-col gap-3 rounded-3xl bg-card p-5 ring-1 ring-border"
        >
          <p id="clear-results-confirm-title" className="text-lg font-semibold">
            {t('results.clearConfirm')}
          </p>
          <p id="clear-results-confirm-body" className="text-base leading-relaxed text-muted-foreground">
            {t('results.clearConfirmBody')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onConfirm()
                } finally {
                  setBusy(false)
                }
              }}
              className="min-h-12 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? t('common.loading') : t('results.clearYes')}
            </button>
            <button
              ref={keepRef}
              type="button"
              onClick={cancel}
              className="min-h-12 rounded-full bg-background px-5 text-base font-semibold ring-1 ring-border hover:bg-muted"
            >
              {t('results.clearKeep')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
