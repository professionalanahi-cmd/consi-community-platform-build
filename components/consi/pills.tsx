'use client'

import { cn } from '@/lib/utils'

/**
 * One-tap choice pills, used instead of dropdowns: every option is visible and reachable with a single tap.
 * Behaves as a radio group (arrow keys move between options).
 */
export function Pills<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap gap-2', className)}
      onKeyDown={(e) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return
        e.preventDefault()
        const i = options.findIndex((o) => o.value === value)
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
        const next = options[(i + step + options.length) % options.length]
        onChange(next.value)
        const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
        buttons[(i + step + options.length) % options.length]?.focus()
      }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 rounded-full px-4 text-base font-semibold outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              on ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background text-foreground ring-border hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
