'use client'

import { FileUp, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { EMPTY_DRAFT, type ListingDraft } from './listing-form'

export function FlyerUpload({ onExtracted, onManual }: { onExtracted: (d: ListingDraft) => void; onManual: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    const fd = new FormData()
    if (file) fd.append('file', file)
    if (text.trim()) fd.append('text', text)
    const res = await fetch('/api/provider/extract', { method: 'POST', body: fd })
    setBusy(false)
    const data = await res.json()
    if (!res.ok) return setError(data.error ?? 'Could not read that flyer')
    const f = data.fields
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && !(Array.isArray(v) && v.length === 0)))
    onExtracted({
      ...EMPTY_DRAFT,
      ...clean,
      originalFlyer: { ...data.flyer, text: String(f.rawText ?? '').slice(0, 4000) },
      uncertainFields: f.uncertainFields ?? [],
    } as ListingDraft)
  }

  return (
    <section className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-sm">
      <h2 className="font-heading text-2xl font-semibold">Add a program</h2>
      <p className="text-base leading-relaxed text-muted-foreground">
        Upload a flyer (image, PDF, or text) or paste its text. CONSI drafts the listing and flags anything it was unsure about. Nothing is published automatically.
      </p>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background p-4 text-center hover:bg-muted">
        <FileUp className="size-7 text-accent-foreground" aria-hidden="true" />
        <span className="text-base font-medium">{file ? file.name : 'Choose a flyer file'}</span>
        <span className="text-sm text-muted-foreground">PNG, JPG, WEBP, PDF, or TXT up to 6 MB</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-base font-medium">Or paste flyer text</span>
        <textarea rows={4} maxLength={6000} value={text} onChange={(e) => setText(e.target.value)} className="rounded-2xl bg-background p-4 text-base ring-1 ring-border" />
      </label>
      <p role="alert" className="text-base font-medium text-destructive">
        {error}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || (!file && !text.trim())} onClick={run} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
          {busy ? 'Reading flyer…' : 'Draft from flyer'}
        </button>
        <button type="button" onClick={onManual} className="min-h-12 rounded-full px-6 text-lg font-semibold ring-1 ring-border hover:bg-muted">
          Enter manually
        </button>
      </div>
    </section>
  )
}
