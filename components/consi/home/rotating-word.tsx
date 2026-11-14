'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const INTERVAL_MS = 2600

export function RotatingWord({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length < 2) return
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: number | undefined

    const start = () => {
      window.clearInterval(timer)
      timer = undefined
      if (motionQuery.matches) {
        setIndex(0)
        return
      }
      timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), INTERVAL_MS)
    }

    start()
    motionQuery.addEventListener('change', start)
    return () => {
      window.clearInterval(timer)
      motionQuery.removeEventListener('change', start)
    }
  }, [words])

  const active = index % words.length
  const previous = (active - 1 + words.length) % words.length

  return (
    // Every word shares one grid cell, so the slot is always as wide as the longest word and the heading never reflows.
    // The vertical padding/negative margin pair keeps descenders visible inside the clipped slot without changing line height.
    <span className={cn('-my-1 inline-grid overflow-hidden py-1 align-bottom whitespace-nowrap', className)}>
      {words.map((word, i) => (
        <span
          key={word}
          className={cn(
            'col-start-1 row-start-1 text-center transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none',
            i === active
              ? 'translate-y-0 opacity-100'
              : i === previous
                ? '-translate-y-full opacity-0'
                : 'translate-y-full opacity-0',
          )}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
