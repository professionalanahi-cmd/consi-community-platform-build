'use client'

import { cn } from '@/lib/utils'

/**
 * Segmented control for the few places where seeing every option at once is better than a dropdown
 * (two to four short choices that people switch often). Matches the List / Map switch on Results.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T | null
  options: { value: T; label: string; lang?: string; style?: React.CSSProperties }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-1 rounded-[1.25rem] bg-muted p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            lang={o.lang}
            onClick={() => onChange(o.value)}
            style={o.style}
            className={cn(
              'min-h-12 min-w-0 rounded-2xl px-2 text-base font-semibold leading-tight outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
              on ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
