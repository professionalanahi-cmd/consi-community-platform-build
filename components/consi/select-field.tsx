'use client'

import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

/** The app's dropdown: a native select (so phones show their own picker) with one consistent look. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
  hideLabel?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-base font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
          className="h-12 w-full appearance-none rounded-2xl bg-background pl-4 pr-11 text-base font-medium outline-none ring-1 ring-border transition-shadow hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  )
}
